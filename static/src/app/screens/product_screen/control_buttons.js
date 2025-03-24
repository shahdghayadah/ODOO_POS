import { _t } from "@web/core/l10n/translation";
import { ControlButtons } from '@point_of_sale/app/screens/product_screen/control_buttons/control_buttons';
import { patch } from "@web/core/utils/patch";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { makeAwaitable } from "@point_of_sale/app/store/make_awaitable_dialog";
import { SelectionPopup } from "@point_of_sale/app/utils/input_popups/selection_popup";  // Import SelectionPopup

patch(ControlButtons.prototype, {

    formatDateAndTime(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },
    generateReportDRAWERContent() {
        let content = "";
    
        // Divider line
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 5px 0; font-size:1px;'></div>\n";
    
        // Format and display Opening Date
        const openingDate = new Date(this.pos.session.start_at);
        const formattedOpeningDate = this.formatDateAndTime(openingDate);
        content += `<div style="display: flex; align-items: flex-start; margin-bottom: 0; direction: rtl; text-align: right;">
                    <div style="flex: 1;">תאריך פתיחה:</div>
                    <div style="flex: 1; word-wrap: break-word;">${formattedOpeningDate}</div>
                </div>\n`;
    
        // Cashier Information
        if (this.pos.cashier) {
            content += `<div style="display: flex; align-items: flex-start; margin-top: 10px; font-size: 0.9em; direction: rtl; text-align: right;">
                           <div style="flex: 1;">שם הקופאי:</div>
                           <div style="flex: 1; word-wrap: break-word;">${this.pos.cashier.name}</div>
                       </div>\n`;
        }
    
        // Note about manual opening of the drawer
        content += `<div style="display: flex; align-items: flex-start; margin-top: 10px; font-size: 0.9em; direction: rtl; text-align: right;">
                       <div style="flex: 1;">הערה:</div>
                       <div style="flex: 1; word-wrap: break-word;">המגירה נפתחה ידנית</div>
                   </div>\n`;
    
        return content;
    },
    printReportDRAWER(reportContent) {
        const printWindow = window.open('', '' ,'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>DRAWER</title>');
            printWindow.document.write('<style>');
            printWindow.document.write('@page { margin: 0; }'); // Removes default browser margins, including headers/footers
            printWindow.document.write('body {  font-size: 12px; }');
            printWindow.document.write('pre { white-space: pre-wrap; word-wrap: break-word; }'); // Ensure line wrapping
            printWindow.document.write('</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<pre>${reportContent}</pre>`);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus(); // for IE browser
            printWindow.print();
            printWindow.close();
        } else {
            console.error('Failed to open print window. Please allow pop-ups.');
        }
    },

    downloadReportDRAWER() {
        const reportContent = this.generateReportDRAWERContent();
        this.printReportDRAWER(reportContent);
    },
    async clickDiscount() {
        // Ask the user to choose discount type
        const selectedType = await makeAwaitable(this.dialog, SelectionPopup, {
            title: _t("Discount Type"),
            list: [
                { id: "percentage", label: _t("Percentage"), item: "percentage" },
                { id: "fixed", label: _t("Fixed Amount"), item: "fixed" },
            ],
        });
    
        if (!selectedType) {  // User cancelled
            return;
        }
    
        const discountType = selectedType;
    
        let title = discountType === "percentage" ? _t("Discount Percentage") : _t("Discount Amount");
    
        const enteredValue = await makeAwaitable(this.dialog, NumberPopup, {
            title: title,
            startingValue: this.pos.config.discount_pc || 0,
        });
    
        if (!enteredValue) { // User cancelled
            return;
        }
    
        // Ensure enteredValue is a string
        const valueString = String(enteredValue);
    
        // Parse the value as a float
        const val = this.env.utils.parseValidFloat(valueString);
    
        if (isNaN(val)) {
            this.dialog.add(AlertDialog, {
                title: _t("Invalid Input"),
                body: _t("Please enter a valid number."),
            });
            return;
        }
    
        this.apply_discount(val, discountType); // Pass discountType
    },

    // FIXME business method in a compoenent, maybe to move in pos_store
    async apply_discount(value, discountType) {
        const order = this.pos.get_order();
        const lines = order.get_orderlines();
        const product = this.pos.config.discount_product_id;

        if (product === undefined) {
            this.dialog.add(AlertDialog, {
                title: _t("No discount product found"),
                body: _t(
                    "The discount product seems misconfigured. Make sure it is flagged as 'Can be Sold' and 'Available in Point of Sale'."
                ),
            });
            return;
        }
        // Remove existing discounts
        lines.filter((line) => line.get_product() === product).forEach((line) => line.delete());

        // Add one discount line per tax group
        const linesByTax = order.get_orderlines_grouped_by_tax_ids();
        for (const [tax_ids, lines] of Object.entries(linesByTax)) {
            const tax_ids_array = tax_ids
                .split(",")
                .filter((id) => id !== "")
                .map((id) => Number(id));

            const baseToDiscount = order.calculate_base_amount(
                lines.filter((ll) => ll.isGlobalDiscountApplicable())
            );

            const taxes = tax_ids_array
                .map((taxId) => this.pos.models["account.tax"].get(taxId))
                .filter(Boolean);

            let discount;
            let tax_ids_for_discount = [["link", ...taxes]]; // Default: include taxes
            if (discountType === "percentage") {
                discount = (-value / 100.0) * baseToDiscount;
            } else { // "fixed"
                discount = -value;
                tax_ids_for_discount = []; // Fixed amount: no taxes
            }


            if (discount < 0) {
                await this.pos.addLineToCurrentOrder(
                    { product_id: product, price_unit: discount, tax_ids: tax_ids_for_discount },
                    { merge: false }
                );
            }
        }
    },
});