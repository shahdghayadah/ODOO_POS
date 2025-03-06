import { ConnectionLostError } from "@web/core/network/rpc";
import { _t } from "@web/core/l10n/translation";
import { ClosePosPopup } from '@point_of_sale/app/navbar/closing_popup/closing_popup';
import { patch } from "@web/core/utils/patch";
import { ask } from "@point_of_sale/app/store/make_awaitable_dialog";
import {sendDoPeriodic} from '@point_of_sale_1/app/screens/payment_screen/payment_functions';
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { useService } from "@web/core/utils/hooks";
import {  useState } from "@odoo/owl";
import { useAsyncLockedMethod } from "@point_of_sale/app/utils/hooks";
 
patch(ClosePosPopup.prototype, {
 
    setup() {
        this.pos = usePos();
        this.report = useService("report");
        this.hardwareProxy = useService("hardware_proxy");
        this.dialog = useService("dialog");
        this.ui = useState(useService("ui"));
        this.state = useState(this.getInitialState());
        this.confirm = useAsyncLockedMethod(this.confirm);
        this.orm = useService("orm");
    },
    // all the code under here is done by shahd and rami
    // New Function: downloadReportX
    downloadReportX() {
        const reportContent = this.generateReportXContent();
        this.printReportX(reportContent);
    },
 
    formatDateAndTime(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },
    async confirm() {
        console.log("confirm")
        if (!this.pos.config.cash_control || this.env.utils.floatIsZero(this.getMaxDifference())) {
            await this.closeSession();
            this.downloadReportZ();
            return;
        }
        if (this.hasUserAuthority()) {
            const response = await ask(this.dialog, {
                title: _t("Payments Difference"),
                body: _t(
                    "The money counted doesn't match what we expected. Want to log the difference for the books?"
                ),
                confirmLabel: _t("Proceed Anyway"),
                cancelLabel: _t("Discard"),
            });
            if (response) {
                this.downloadReportZ();
                await  this.closeSession();
                return;
 
            }
            return ;
        }
        this.dialog.add(ConfirmationDialog, {
            title: _t("Payments Difference"),
            body: _t(
                "The maximum difference allowed is %s.\nPlease contact your manager to accept the closing difference.",
                this.env.utils.formatCurrency(this.props.amount_authorized_diff)
            ),
        });
       
 
    },
    generateReportXContent() {
        let content = "";
   
        // === Header with Company Name and VAT ID ===
        content += `<div style="display: flex; flex-direction: column; align-items: center; direction: rtl; width: 100%;">
            <div style="font-size: 18px; line-height: 0.4; text-align: center; width: 100%;">
                <div>${this.props.orders_details.company_name}</div>
                <div>${this.props.orders_details.company_street}</div>
                <div>טלפון ${this.props.orders_details.company_phone}</div>
                <div>ח.פ ${this.props.orders_details.company_vat}</div>
                <div>מסוף ${this.props.orders_details.company_registry}</div>
                <div>דו"ח X</div>
            </div>
            </div>\n`;
   
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 5px 0; font-size:1px;'></div>\n";
   
        // Format and display Opening Date
        const openingDate = new Date(this.pos.session.start_at);
        const formattedOpeningDate = this.formatDateAndTime(openingDate);
        content += `<div style="display: flex; align-items: flex-start; margin-bottom: 0; direction: rtl; text-align: right;">
                    <div style="flex: 1;">תאריך פתיחה:</div>
                    <div style="flex: 1; word-wrap: break-word;">${formattedOpeningDate}</div>
                </div>\n`;
   
        // Format and display Report Date
        const reportDate = new Date();
        const formattedReportDate = this.formatDateAndTime(reportDate);
        content += `<div style="display: flex; align-items: flex-start; margin-bottom: 0; direction: rtl; text-align: right;">
                    <div style="flex: 1;">תאריך דוח:</div>
                    <div style="flex: 1; word-wrap: break-word;">${formattedReportDate}</div>
                </div>\n`;
   
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
   
        // Add Payment Method and Tax Information Summary (Combined)
        content += `<div style="direction: rtl; text-align: right;">סיכום אמצעי תשלום</div>\n`;
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
        content += `<table style='width:100%; border-collapse: collapse; border: 1px solid #000; direction: rtl; text-align: right;'>
                    <thead style='border-bottom: 1px solid #000;'>
                        <tr>
                            <th style='padding: 5px;'>אמצעי תשלום</th>
                            <th style='padding: 5px;'>סכום</th>
                        </tr>
                    </thead>
                    <tbody>`;
   
        // Cash Payment
        const expectedCash = this.props.default_cash_details.amount || 0.00;
        content += `
                    <tr style='border-bottom: 1px solid #eee;'>
                        <td style='padding: 5px;'>מזומן</td>
                        <td style='padding: 5px;'>${this.env.utils.formatCurrency(expectedCash)}</td>
                    </tr>
                `;
   
        // Online Payment Methods
        let totalPayments = expectedCash;
        this.props.non_cash_payment_methods.forEach(pm => {
            content += `
                        <tr style='border-bottom: 1px solid #eee;'>
                            <td style='padding: 5px;'>${pm.name}</td>
                            <td style='padding: 5px;'>${this.env.utils.formatCurrency(pm.amount)}</td>
                        </tr>
                    `;
            totalPayments += pm.amount;
        });
   
        // Calculate total tax
        const totalTax = this.props.orders_details.total_cash_payment * (this.props.orders_details.company / 100);
   
        // Calculate total payments without tax
        const totalPaymentsWithoutTax = totalPayments - totalTax;
   
        // Add Total Payments and Total Tax to the table footer
        content += `
                    </tbody>
                    <tfoot style='border-top: 1px solid #000;'>
                        <tr>
                            <td style='padding: 5px; font-weight: bold;'>סך הכל</td>
                            <td style='padding: 5px;'>${this.env.utils.formatCurrency(totalPayments)}</td>
                        </tr>
                    </tfoot>
                    </table>
                    `;
   
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
   
        // Add notes
        if (this.state.notes) {
            content += `<div style="direction: rtl; text-align: right;">הערות:</div>\n`;
            content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
            content += `${this.state.notes}\n`;
            content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
        }
   
        // Cashier Information in Footer
        if (this.pos.cashier) {
            content += `<div style="display: flex; align-items: flex-start; margin-top: 10px; font-size: 0.9em; direction: rtl; text-align: right;">
                           <div style="flex: 1;">שם הקופאי:</div>
                           <div style="flex: 1; word-wrap: break-word;">${this.pos.cashier.name}</div>
                       </div>\n`;
        }
   
        return content;
    },
   
    printReportX(reportContent) {
        const printWindow = window.open('', '' ,'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>X דו"ח </title>');
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
    async downloadReportZ() {
        const reportContent = this.generateReportZContent();
        this.printReportZ(reportContent);
        let result;
        
        const paymentTemplates = await this.orm.searchRead("pos.payment.method", [], ['use_payment_terminal']);

        for (const paymentTemplate of paymentTemplates) {
            if (paymentTemplate.use_payment_terminal === 'nayax') {
                result = await sendDoPeriodic(paymentTemplates[0].public_api_key, paymentTemplates[0].api_key);
                break; // Exit the loop early if we find a match
            }
        }
        console.log("paymentTemplates", paymentTemplates)
    },
    totalAmount: 0,
 
    generateReportZContent() {
        let content = "";
   
        // === Header with Company Name and VAT ID ===
        content += `<div style="display: flex; flex-direction: column; align-items: center; direction: rtl; width: 100%;">
            <div style="font-size: 18px; line-height: 0.4; text-align: center; width: 100%;">
                <div>${this.props.orders_details.company_name}</div>
                <div>${this.props.orders_details.company_street}</div>
                <div>טלפון ${this.props.orders_details.company_phone}</div>
                <div>ח.פ ${this.props.orders_details.company_vat}</div>
                <div>מסוף ${this.props.orders_details.company_registry}</div>
                <div>דו"ח Z</div>
            </div>
            </div>\n`;
 
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 5px 0; font-size:1px;'></div>\n";
 
        // Format and display Opening Date
        const openingDate = new Date(this.pos.session.start_at);
        const formattedOpeningDate = this.formatDateAndTime(openingDate);
        content += `<div style="display: flex; align-items: flex-start; margin-bottom: 0; direction: rtl; text-align: right;">
                    <div style="flex: 1;">תאריך פתיחה:</div>
                    <div style="flex: 1; word-wrap: break-word;">${formattedOpeningDate}</div>
                </div>\n`;
 
        // Format and display Report Date
        const reportDate = new Date();
        const formattedReportDate = this.formatDateAndTime(reportDate);
        content += `<div style="display: flex; align-items: flex-start; margin-bottom: 0; direction: rtl; text-align: right;">
                    <div style="flex: 1;">תאריך דוח:</div>
                    <div style="flex: 1; word-wrap: break-word;">${formattedReportDate}</div>
                </div>\n`;
 
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
 
        // === Orders Details Section ===
        content += `<div style="direction: rtl; text-align: right;">קטגוריות הזמנות:</div>\n`;
        if (this.props.orders_details && Array.isArray(this.props.orders_details.orders) && this.props.orders_details.orders.length > 0) {
            const orders = this.props.orders_details.orders;
 
            // --- Sales Section ---
            content += `<div style='font-weight: bold; margin-top: 10px; direction: rtl; text-align: right;'>מכירות</div>\n`;
            content += `<table style='width:100%; border-collapse: collapse; border: 1px solid #000; direction: rtl; text-align: right;'>
                            <thead style='border-bottom: 1px solid #000;'>
                                <tr>
                                    <th style='padding: 5px;'>קטגוריה</th>
                                    <th style='padding: 5px;'>כמות</th>
                                    <th style='padding: 5px;'>סכום</th>
                                </tr>
                            </thead>
                            <tbody>`;
            let totalSalesQuantity = 0;
            let totalSalesAmount = 0;
 
            orders.forEach(category => {
                const hasSalesProducts = category.products && category.products.some(line => line.qty > 0);
                if (hasSalesProducts) {
                    let categoryTotalQty = 0;
                    let categoryTotalAmount = 0;
 
                    if (category.products && category.products.length > 0) {
                        const salesProducts = category.products.filter(line => line.qty > 0);
                        salesProducts.forEach(line => {
                            categoryTotalQty += line.qty;
                            categoryTotalAmount += line.price_subtotal_incl;
                        });
                        totalSalesQuantity += categoryTotalQty;
                        totalSalesAmount += categoryTotalAmount;
                    }
                    content += `
                                <tr style='border-bottom: 1px solid #eee;'>
                                    <td style='padding: 5px;'>${category.name}</td>
                                    <td style='padding: 5px;'>${categoryTotalQty}</td>
                                    <td style='padding: 5px;'>${this.env.utils.formatCurrency(categoryTotalAmount)}</td>
                                </tr>
                            `;
                }
            });
            const totalSalesTax = totalSalesAmount * (this.props.orders_details.company / 100);
            const totalPaymentsWithoutTax = totalSalesAmount - totalSalesTax;
            content += `
                                </tbody>
                              <tfoot style='border-top: 1px solid #000;'>
                              <tr>
                                    <td style='padding: 5px; font-weight: bold;'>סכום ללא מע"מ</td>
                                    <td style='padding: 5px;'></td>
                                    <td style='padding: 5px;'>${this.env.utils.formatCurrency(totalPaymentsWithoutTax)}</td>
                                </tr>
                                <tr>
                                    <td style='padding: 5px; font-weight: bold;'>סכום מע"מ</td>
                                    <td style='padding: 5px;'></td>
                                    <td style='padding: 5px;' colspan='2'>${this.env.utils.formatCurrency(totalSalesTax)}</td>
                                </tr>
                            <tr>
                                <td style='padding: 5px; font-weight: bold;'> כולל מע"מ סה"כ</td>
                                <td style='padding: 5px;'>${totalSalesQuantity}</td>
                                <td style='padding: 5px;'>${this.env.utils.formatCurrency(totalSalesAmount)}</td>
                                </tr>
                               
                               
                            </tfoot>
                            </table>\n`;
 
 
            content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
 
            // --- Refunds Section ---
            content += `<div style='font-weight: bold; margin-top: 10px; direction: rtl; text-align: right;'>החזרים</div>\n`;
            content += `<table style='width:100%; border-collapse: collapse; border: 1px solid #000; direction: rtl; text-align: right;'>
                    <thead style='border-bottom: 1px solid #000;'>
                        <tr>
                            <th style='padding: 5px;'>קטגוריה</th>
                            <th style='padding: 5px;'>כמות</th>
                            <th style='padding: 5px;'>סכום</th>
                        </tr>
                    </thead>
                    <tbody>`;
            let totalRefundQuantity = 0;
            let totalRefundAmount = 0;
            orders.forEach(category => {
                const hasRefundProducts = category.products && category.products.some(line => line.qty < 0);
                if (hasRefundProducts) {
                    let categoryTotalQty = 0;
                    let categoryTotalAmount = 0;
                    if (category.products && category.products.length > 0) {
                        const refundProducts = category.products.filter(line => line.qty < 0);
                        refundProducts.forEach(line => {
                            categoryTotalQty += Math.abs(line.qty); // Use Math.abs() here
                            categoryTotalAmount += line.price_subtotal_incl;
                        });
                        totalRefundQuantity += categoryTotalQty;
                        totalRefundAmount += categoryTotalAmount;
                    }
                    content += `
                            <tr style='border-bottom: 1px solid #eee;'>
                                <td style='padding: 5px;'>${category.name}</td>
                                <td style='padding: 5px;'>${categoryTotalQty}</td>
                                <td style='padding: 5px;'>${this.env.utils.formatCurrency(categoryTotalAmount)}</td>
                            </tr>
                        `;
                }
            });
            const totalRefundTax = totalRefundAmount * (this.props.orders_details.company / 100);
            const totalRefundsWithoutTax = totalRefundAmount - totalRefundTax;
            content += `
                </tbody>
                <tfoot style='border-top: 1px solid #000;'>
                    <tr>
                        <td style='padding: 5px; font-weight: bold;'>סכום ללא מע"מ</td>
                        <td style='padding: 5px;'></td>
                        <td style='padding: 5px;'>${this.env.utils.formatCurrency(totalRefundsWithoutTax)}</td>
                    </tr>
                    <tr>
                        <td style='padding: 5px; font-weight: bold;'>סכום מע"מ</td>
                        <td style='padding: 5px;'></td>
                        <td style='padding: 5px;' colspan='2'>${this.env.utils.formatCurrency(totalRefundTax)}</td>
                    </tr>
                    <tr>
                        <td style='padding: 5px; font-weight: bold;'>סה"כ</td>
                        <td style='padding: 5px;'>${totalRefundQuantity}</td>
                        <td style='padding: 5px;'>${this.env.utils.formatCurrency(totalRefundAmount)}</td>
                    </tr>
 
 
                </tfoot>
                </table>\n`;
 
            content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
        } else {
            content += `<div style="direction: rtl; text-align: right;">לא נמצאו הזמנות.</div>\n`;
        }
 
 
        // === Cash Control Summary Section ===
        // Add Payment Method and Tax Information Summary (Combined)
        content += `<div style="direction: rtl; text-align: right;">סיכום תשלומים ומסים:</div>\n`;
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
        content += `<table style='width:100%; border-collapse: collapse; border: 1px solid #000; direction: rtl; text-align: right;'>
                    <thead style='border-bottom: 1px solid #000;'>
                        <tr>
                            <th style='padding: 5px;'>אמצעי תשלום</th>
                            <th style='padding: 5px;'>סכום</th>
                        </tr>
                    </thead>
                    <tbody>`;
 
        // Cash Payment
        const expectedCash = this.props.default_cash_details.amount || 0.00;
        content += `
                    <tr style='border-bottom: 1px solid #eee;'>
                        <td style='padding: 5px;'>מזומן</td>
                        <td style='padding: 5px;'>${this.env.utils.formatCurrency(expectedCash)}</td>
                    </tr>
                `;
 
        //Online Payment Methods
        let totalPayments = expectedCash;
        this.props.non_cash_payment_methods.forEach(pm => {
            content += `
                        <tr style='border-bottom: 1px solid #eee;'>
                            <td style='padding: 5px;'>${pm.name}</td>
                            <td style='padding: 5px;'>${this.env.utils.formatCurrency(pm.amount)}</td>
                        </tr>
                    `;
            totalPayments += pm.amount;
        });
 
        // Calculate total tax
        const totalTax = this.props.orders_details.total_cash_payment * (this.props.orders_details.company / 100);
 
        // Calculate total payments without tax
        const totalPaymentsWithoutTax = totalPayments - totalTax;
 
        // Add Total Payments and Total Tax to the table footer
        content += `
                    </tbody>
                    <tfoot style='border-top: 1px solid #000;'>
                        <tr>
                            <td style='padding: 5px; font-weight: bold;'>סך הכל</td>
                            <td style='padding: 5px;'>${this.env.utils.formatCurrency(totalPayments)}</td>
                        </tr>
                    </tfoot>
                    </table>
                    `;
 
        // === Notes Section ===
        if (this.state.notes) {
            content += `<div style="direction: rtl; text-align: right;">הערות:</div>\n`;
            content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
            content += `<div style="direction: rtl; text-align: right;">${this.state.notes}</div>\n`;
            content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 10px 0; font-size:1px;'></div>\n";
        }
 
        //Cashier Information in Footer
        if (this.pos.cashier) {
            content += `<div style="display: flex; align-items: flex-start; margin-top: 10px; font-size: 0.9em; direction: rtl; text-align: right;">
                           <div style="flex: 1;">שם הקופאי:</div>
                           <div style="flex: 1; word-wrap: break-word;">${this.pos.cashier.name}</div>
                       </div>\n`;
        }
        return content;
    },
    processOrderLines(orders) {
        return orders;
    },
    printReportZ(reportContent) {
        const printWindow = window.open('', '', 'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>Z  דו"ח </title>');
            printWindow.document.write('<style>');
            printWindow.document.write('@page { margin: 0; }'); // Removes default browser margins, including headers/footers
            printWindow.document.write('body {  font-size: 12px; font-family: sans-serif; }');  // ADDED font-family
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
    }
});
 