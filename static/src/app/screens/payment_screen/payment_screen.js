import { _t } from "@web/core/l10n/translation";
import { useErrorHandlers, useAsyncLockedMethod } from "@point_of_sale/app/utils/hooks";
import { useService } from "@web/core/utils/hooks";

import { AlertDialog, ConfirmationDialog } from "@web/core/confirmation_dialog/confirmation_dialog";

import { usePos } from "@point_of_sale/app/store/pos_hook";
import { Component, useState, onMounted } from "@odoo/owl";
import { PaymentScreen } from '@point_of_sale/app/screens/payment_screen/payment_screen';
import { patch } from "@web/core/utils/patch";

patch(PaymentScreen.prototype, {
    setup() {
        this.pos = usePos();
        this.ui = useState(useService("ui"));
        this.dialog = useService("dialog");
        this.invoiceService = useService("account_move");
        this.notification = useService("notification");
        this.hardwareProxy = useService("hardware_proxy");
        this.printer = useService("printer");
        this.payment_methods_from_config = this.pos.config.payment_method_ids
            .slice()
            .sort((a, b) => a.sequence - b.sequence);
        this.numberBuffer = useService("number_buffer");
        this.numberBuffer.use(this._getNumberBufferConfig);
        useErrorHandlers();
        this.payment_interface = null;
        this.error = false;
        this.pos.validateOrder = this.validateOrder.bind(this);
        this.pos.currentOrder = this.currentOrder;
        this.orm = useService("orm");


    },


    // kad_shahd
    get allPaymentsAreCash() {
        return this.paymentLines.every(line => line.payment_method_id.type === 'cash');
    },


    // kad_shahd
    get allPaymentsAreBank() {
        return this.paymentLines.every(line => line.payment_method_id.type === 'bank');
    },

    isPaymentComplete() {
        return this.currentOrder.get_due() === 0;
    },




    // kad_shahd :edit  to handel case terminal nayax 
    addNewPaymentLine(paymentMethod) {

        if (
            paymentMethod.type === "pay_later" &&
            (!this.currentOrder.to_invoice ||
                this.pos.data["ir.module.module"].find((m) => m.name === "pos_settle_due")
                    ?.state !== "installed")
        ) {
            this.notification.add(
                _t(
                    "To ensure due balance follow-up, generate an invoice or download the accounting application. "
                ),
                { autocloseDelay: 7000, title: _t("Warning") }
            );
        }


        if (paymentMethod.use_payment_terminal === "nayax") {
            const result = this.currentOrder.add_paymentline(paymentMethod);
            // if (!this.currentOrder.check_paymentlines_rounding()) {
            //     this._display_popup_error_paymentlines_rounding();
            // }

            if (result) {
                this.numberBuffer.reset();
                // Skip sending payment request for Nayax
                console.log("Payment line added for Nayax, but no request sent.");
                return true;
            } else {
                this.dialog.add(AlertDialog, {
                    title: _t("Error"),
                    body: _t("There is already an electronic payment in progress."),
                });
                return false;
            }
        }



        if (this.pos.paymentTerminalInProgress && paymentMethod.use_payment_terminal) {
            this.dialog.add(AlertDialog, {
                title: _t("Error"),
                body: _t("There is already an electronic payment in progress."),
            });
            return;
        }

        // original function: click_paymentmethods
        const result = this.currentOrder.add_paymentline(paymentMethod);
        // if (!this.currentOrder.check_paymentlines_rounding()) {
        //     this._display_popup_error_paymentlines_rounding();
        // }

        if (result) {
            this.numberBuffer.reset();
            if (paymentMethod.use_payment_terminal) {
                const newPaymentLine = this.paymentLines.at(-1);
                this.sendPaymentRequest(newPaymentLine);
            }
            return true;
        } else {
            this.dialog.add(AlertDialog, {
                title: _t("Error"),
                body: _t("There is already an electronic payment in progress."),
            });
            return false;
        }


    },
    updateSelectedPaymentline(amount = false) {
        if (this.paymentLines.every((line) => line.paid)) {
            this.currentOrder.add_paymentline(this.payment_methods_from_config[0]);
        }
        if (!this.selectedPaymentLine) {
            return;
        } // do nothing if no selected payment line
        if (amount === false) {
            if (this.numberBuffer.get() === null) {
                amount = null;
            } else if (this.numberBuffer.get() === "") {
                amount = 0;
            } else {
                amount = this.numberBuffer.getFloat();
            }
        }
        // disable changing amount on paymentlines with running or done payments on a payment terminal
        const payment_terminal = this.selectedPaymentLine.payment_method_id.payment_terminal;
        const hasCashPaymentMethod = this.payment_methods_from_config.some(
            (method) => method.type === "cash"
        );
        if (
            !hasCashPaymentMethod &&
            amount > this.currentOrder.get_due() + this.selectedPaymentLine.amount
        ) {
            this.selectedPaymentLine.set_amount(0);
            this.numberBuffer.set(this.currentOrder.get_due().toString());
            amount = this.currentOrder.get_due();
            this.showMaxValueError();
        }
        if (
            payment_terminal &&
            !["pending", "retry"].includes(this.selectedPaymentLine.get_payment_status())
        ) {
            return;
        }
        if (amount === null) {
            this.deletePaymentLine(this.selectedPaymentLine.uuid);
        } else {
            this.selectedPaymentLine.set_amount(amount);
        }
    },
    async validateOrder(isForceValidate) {
        this.numberBuffer.capture();
        if (await this._isOrderValid(isForceValidate)) {
            // remove pending payments before finalizing the validation
            for (const line of this.paymentLines) {
                if (!line.is_done()) {
                    this.currentOrder.remove_paymentline(line);
                }
            }            
            await this.printOrderByCategory();

            await this._finalizeValidation();

            this.pos.printReceipt()


        }
    },
    async printOrderByCategory() {
        const orderLines = this.currentOrder.get_orderlines();
        const printerData = await this.orm.searchRead("printer.kad", [], ['name', 'pos_category_id']);
        console.log(printerData);  // Log the printer data from searchRead

        // Create a dynamic mapping of printers based on the pos_category_id
        const printers = printerData.reduce((acc, item) => {
            // Assuming pos_category_id is an array with [ID, Name], and we map it to the printer name
            acc[item.pos_category_id[1]] = item.name;
            return acc;
        }, {});
    
        console.log("Printers mapping:", printers);
    
        console.log("Current order:", this.currentOrder);
    
        // Group order lines by category
        const groupedOrders = {};
    
        for (const line of orderLines) {
            const category = line.product_id.pos_categ_ids[0]?.name || "Other";
            
            if (!groupedOrders[category]) {
                groupedOrders[category] = [];
            }
            
            groupedOrders[category].push(line);
        }
    
        console.log("Grouped orders:", groupedOrders);
        // Iterate over each category and send a consolidated print request
        for (const category in groupedOrders) {
            let printerName;

            printerName = printers[category];
            
            // if (category.includes("Food")) {
            //     printerName = printers['Kitchen'];
            // } else if (category.includes("Drinks")) {
            //     printerName = printers['Coffee'];
            // } else {
            //     printerName = printers['USB'];
            // }
    
            if (printerName) {
                await this.sendToPrinter(groupedOrders[category], category, printerName);
            }
        }
    }
    ,
    async sendToPrinter(orderLines, category, printerName) {
        const result =  await this.orm.searchRead("res.config.settings", [], ['printer_API']);
        const apiUrl = result[0].printer_API;
        // Format order details for printing
        let orderDetails = `Order for ${printerName}\nTime: ${this.currentOrder.date_order}\nOrder ID: ${this.currentOrder.tracking_number}\nCategory: ${category}\n\nItems:\n`;
    
        orderLines.forEach(line => {
            orderDetails += `- ${line.qty}x ${line.full_product_name} \n`;
            if (line.note) {

                orderDetails += ` (Notes: ${line.note})`;
            }

            orderDetails += `\n`;

        });
    
        const requestBody = {
            "TextContent": orderDetails,
            "PrinterName": printerName
        };
    
        try {
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody)
            });
    
            if (!response.ok) {
                throw new Error(`Printing failed: ${response.statusText}`);
            }
    
            const responseData = await response.json();
            console.log("Print request successful:", responseData);
        } catch (error) {
            console.error("Error sending print request:", error);
        }
    }

});