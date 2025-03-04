import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";
import { parseFloat } from "@web/views/fields/parsers";
import { enhancedButtons } from "@point_of_sale/app/generic_components/numpad/numpad";
import { PaymentScreenPaymentLines } from '@point_of_sale/app/screens/payment_screen/payment_lines/payment_lines';
import { patch } from "@web/core/utils/patch";
import { useService } from "@web/core/utils/hooks";
import { Component, useState , onWillStart} from "@odoo/owl";
import { usePos } from "@point_of_sale/app/store/pos_hook";
import { SelectionPopup } from "@point_of_sale/app/utils/input_popups/selection_popup";
import { makeAwaitable } from "@point_of_sale/app/store/make_awaitable_dialog";
import { ManualPaymentPopup } from "@point_of_sale_1/app/navbar/popup/ManualPaymentPopup";  // Import the new popup
import { CheckPaymentPopup } from "@point_of_sale_1/app/navbar/popup/check_popup/CheckPaymentPopup";  // Import the new popup
import { BankTransferPopup } from "@point_of_sale_1/app/navbar/popup/bank_transfer_popup/BankTransferPopup";  // Import the new popup
import { BitPaymentPopup } from "@point_of_sale_1/app/navbar/popup/bit_popup/BitPaymentPopup";  // Import the new popup

// kad_shahd
patch(PaymentScreenPaymentLines.prototype, {
    setup() {
        this.pos = usePos();
        this.ui = useState(useService("ui"));
        this.dialog = useService("dialog");
        this.notification = useService("notification");
        this.selectedPaymentLines = []; // Initialize the array
        this.orm = useService("orm");
        this.paymentline = null
        this.state = useState({
            latestResponse: null,
        });

        onWillStart(async () => {
            await this.fetchLatestResponse();
            setInterval(async () => {
                await this.fetchLatestResponse();
            }, 1000);  // Poll every 5 seconds
        });
    },

    async fetchLatestResponse() {
        try {
            const response = await fetch('/api/get_latest_response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: {}, // Your JSON data
                }),
            });
    
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
    
            const data = await response.json();
            if (Object.keys(data.result).length && this.paymentline !== null) {
                if (data.result.result.statusCode==0){
                    this.selectedPaymentLines.push(this.paymentline);
                    await this.checkPaymentLinesAmountSum(this.selectedPaymentLines);
                    this.notification.add(
                        _t("התשלום הושלם בהצלחה."),
                        {
                            type: "success",
                            sticky: true,
        
                        }
                    );
                   await fetch('/api/clear_response_data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "call",
                            params: {}, // Your JSON data
                        }),
                    });
                }else if(data.result.result.statusCode==998){
                    console.log('sendPaymentCancel')
                    this.notification.add(
                        _t("העסקה בוטלה על ידי מסוף התשלום."),
                        {
                            type: "danger",
                            sticky: true,
                        }
                    );
                    await this.props.deleteLine(this.paymentline.uuid); 
                    await fetch('/api/clear_response_data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "call",
                            params: {}, // Your JSON data
                        }),
                    });
                    
                }
                else{
                    console.log('sendPaymentCancel')
                    this.notification.add(
                        _t("התשלום המקוון נכשל מהסיבה הבאה: " + data.result.result.statusMessage),
                        {
                            type: "danger",
                            sticky: true,
                        }
                    );
                    await fetch('/api/clear_response_data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "call",
                            params: {}, // Your JSON data
                        }),
                    });
                }
            }
                // console.log("Latest response:",  data);

        } catch (error) {
            console.error("Error fetching latest response:", error);
        }
    },
 
    async selectLine(paymentline) {
        this.paymentline = paymentline
        console.log(paymentline)
        this.props.selectLine(paymentline.uuid);
        if (paymentline.payment_method_id?.type === 'check') {
            console.log( this.pos.currentOrder)
            console.log(this.pos)
            let result1;
            try {
            result1 = await makeAwaitable(this.dialog, CheckPaymentPopup, {
                title: "הזן פרטי צ'ק",
                confirm: async (result1) => {
                    if (result1.confirmed) {
                        console.log(result1.payload)
                        paymentline.check_number= result1.payload.checkNumber
                        paymentline.check_transfer_amount= result1.payload.checkAmount
                        paymentline.check_transfer_date= result1.payload.checkDate
                        paymentline.check_customer_name= result1.payload.customerName
                        // paymentline.check_date= result1.payload.checkDate
                        this.notification.add(
                            _t("פרטי הצ'ק נשמרו בהצלחה"),
                            { type: "success" }
                        );

                        this.selectedPaymentLines.push(paymentline);
                        await this.checkPaymentLinesAmountSum(this.selectedPaymentLines);
                        
                    } else {
                     console.log("Manual Payment Cancelled");
                    }
                },
                close: () => {
                },
                getPayload: (payload) => {
                    result1=payload
                }
            });
        } catch (error) {
                return; // Stop execution due to error
        }
        return;
        }
        else{ if (paymentline.payment_method_id?.type === 'BankTransfer'){
            let result1;
            try {
            result1 = await makeAwaitable(this.dialog, BankTransferPopup, {
                title: "הזן פרטי העברה בנקאית",
                confirm: async (result1) => {
                    if (result1.confirmed) {
                        console.log(result1.payload)
                        paymentline.check_transfer_date= result1.payload.transferDate
                        paymentline.transfer_ref= result1.payload.reference
                        paymentline.check_customer_name= result1.payload.customerName
                        // paymentline.check_date= result1.payload.checkDate
                        this.notification.add(
                            _t("פרטי הצ'ק נשמרו בהצלחה"),
                            { type: "success" }
                        );
                        this.selectedPaymentLines.push(paymentline);
                        await this.checkPaymentLinesAmountSum(this.selectedPaymentLines);

                        console.log(this.selectedPaymentLines)
                    } else {
                     console.log("Manual Payment Cancelled");
                    }
                },
                close: () => {
                },
                getPayload: (payload) => {
                    result1=payload
                }
            });
        } catch (error) {
                return; // Stop execution due to error
        }
             return ;
            
            }else if (paymentline.payment_method_id?.type === 'bit'){
                let result1;
                try {
                result1 = await makeAwaitable(this.dialog, BitPaymentPopup, {
                    title: "הזן פרטי תשלום ביט ",
                    confirm: async (result1) => {
                        if (result1.confirmed) {
                            console.log(result1.payload)
                            paymentline.check_transfer_date= result1.payload.expirationDate
                            paymentline.phone_number= result1.payload.phoneNumber

                            // paymentline.check_date= result1.payload.checkDate
                            this.notification.add(
                                _t("פרטי הצ'ק נשמרו בהצלחה"),
                                { type: "success" }
                            );
                            this.selectedPaymentLines.push(paymentline);
                            await this.checkPaymentLinesAmountSum(this.selectedPaymentLines);
    
                            console.log(this.selectedPaymentLines)
                        } else {
                         console.log("Manual Payment Cancelled");
                        }
                    },
                    close: () => {
                    },
                    getPayload: (payload) => {
                        result1=payload
                    }
                });
            } catch (error) {
                    return; // Stop execution due to error
            }
                 return ;
                }
               
        }            
        if (paymentline.payment_method_id?.type === 'cash') {
            console.log(paymentline.get_amount())
            this.selectedPaymentLines.push(paymentline);
            await this.checkPaymentLinesAmountSum(this.selectedPaymentLines);
            this.notification.add(
                _t("שורת תשלום במזומן נבחרה"),
                { type: "success" }
            );
        }
        const tarminal_name = paymentline.payment_method_id?.use_payment_terminal;
        if (tarminal_name === 'nayax') {

            const api_key = paymentline.payment_method_id?.api_key;
            const public_api_key = paymentline.payment_method_id?.public_api_key;
            const amount = paymentline.get_amount();
            const adjustedAmount = Math.round(amount * 100);
            const absoluteAmount = Math.abs(adjustedAmount);
            const vuid = paymentline.pos_order_id.uuid; // Replace with actual dynamic value if needed
            const tranType = adjustedAmount >= 0 ? 1 : 53;
            let result;
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');

            const formattedTime = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
            let selectedPaymentType;
            try {
                selectedPaymentType = await makeAwaitable(this.dialog, SelectionPopup, {
                    list: [
                        { id: 1, label: "תשלום רגיל", item: { id: 1, name: "Regular" } },
                        { id: 8, label: "עסקת תשלומים", item: { id: 8, name: "Settlements" } },
                        { id: 2, label: "תשלום ידני", item: { id: 2, name: "Manual  Payment" } },
                    ],
                    title: _t("אנא בחר את סוג התשלום"),
                });
            } catch (error) {
                console.error("Error selecting payment type:", error);
            }
            if (!selectedPaymentType) {
                return; // Stop execution if no payment type was selected
            }
            console.log("Selected payment type:", selectedPaymentType);
            let enteredAmount;
            

             if (selectedPaymentType.id === 1) {
                try {

                    const jsonData = {
                        data: {
                            time: formattedTime, // Gets the current date and time in local format
                            ipAddress: api_key // Replace with dynamic IP fetching if needed
                        },
                        "body": {
                        jsonrpc: "2.0",
                        method: "doTransaction",
                        id: "0883012",
                        params: [
                            "ashrait",
                            {
                                vuid: vuid, // Use the vuid variable
                                tranType: tranType, // Transaction type
                                tranCode: 1, // Transaction code
                                creditTerms: 1, // Credit terms
                                amount: absoluteAmount, // Payment amount
                                currency: "376", // Currency code
                                additionalInfo: {
                                    storeId: "string", // Replace with actual store ID if needed
                                    posId: "string" // Replace with actual POS ID if needed
                                }
                            }
                        ]
                    }
                    };
            
                    // Send JSON data to the server
                    const response = await fetch('/save-transaction', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "call",
                            params: jsonData, // Your JSON data
                        }),
                    }


                    
                );
                console.log(response)
                } catch (error) {
                    console.error("Error during transaction request");
                    this.notification.add(
                        _t("לא ניתן היה להתחבר למסוף התשלום. אנא בדוק את חיבור הרשת או את הגדרות ה-IP שלך"),
                        { type: "danger" }
                    );
                    await this.props.deleteLine(paymentline.uuid);
                    return; // Stop execution due to error
                }


                
            }else {if (selectedPaymentType.id === 2){
                let result1;
                try {
                result1 = await makeAwaitable(this.dialog, ManualPaymentPopup, {
                    title: "הזן פרטי תשלום ידני",
                    confirm: async (result1) => {
                        if (result1.confirmed) {
                            console.log(result1.payload)
                            const formattedDate = result1.payload.expirationDate.replace("-", "").substring(2); // Result will be "2502"
                            console.log(formattedDate)
                            const jsonData = {
                                data: {
                                    time: formattedTime,
                                    ipAddress: api_key // Replace with dynamic IP fetching if needed
                                },
                                "body": {
                                jsonrpc: "2.0",
                                method: "doTransaction",
                                id: "123454352",
                                params: [
                                    "ashrait",
                                    {
                                        vuid: vuid,
                                        tranType: 1,
                                        tranCode: 1,
                                        amount: absoluteAmount,
                                        currency: "376",
                                        creditTerms: 1,
                                        posEntryMode: 50,
                                        cardNumber: result1.payload.cardNumber,
                                        expDate: result1.payload.expirationDate,
                                        cvv: result1.payload.cvv,
                                        cardHolderId: result1.payload.cardHolderId
                                        }
                                    
                                ]
                            }
                            };
                    const response = await fetch('/save-transaction', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            jsonrpc: "2.0",
                            method: "call",
                            params: jsonData, // Your JSON data
                        }),
                    });

                        } else {
                         console.log("Manual Payment Cancelled");
                        }
                    },
                    close: () => {
                    },
                    getPayload: (payload) => {
                        result1=payload
                    }
                });
                console.log(result1)
            } catch (error) {
                this.notification.add(
                        _t("לא ניתן היה להתחבר למסוף התשלום. אנא בדוק את חיבור הרשת או את הגדרות ה-IP שלך"),
                        { type: "danger" }
                    );
                    return; // Stop execution due to error
            }

            
        }else {
            if (selectedPaymentType.id === 8) {

                enteredAmount = await makeAwaitable(this.dialog, NumberPopup, {
                    title: _t("מספר תשלומים"),
                    buttons: enhancedButtons(),
                    startingValue: 1, // Start with 1.
                });
                const parsedNum = parseInt(enteredAmount); // Parse to integer.
                console.log("Parsed number:", parsedNum);
                if (isNaN(parsedNum) || parsedNum < 1 || parsedNum > 36) {
                    this.notification.add(
                        _t("אנא הזן מספר שלם בין 1 ל-36."),
                        { type: "danger" }
                    );
                    return; // Reject the input. This is IMPORTANT!
                }
                try {
                    const jsonData = {
                        data: {
                            time:formattedTime, // Gets the current date and time in local format
                            ipAddress: api_key // Replace with dynamic IP fetching if needed
                        },
                        "body": {
                            jsonrpc:"2.0",
                            method:"doTransactionPhase1",
                            id:"67575",
                            params: [
                                "ashrait",{
                                    vuid: vuid,
                                    tranType: 1,
                                    tranCode: 1,
                                    creditTerms: selectedPaymentType.id,
                                    amount: absoluteAmount,
                                    currency: "376",
                                    payments:parsedNum,

                                }
                                ]
                        }

                    };
            const response = await fetch('/save-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: jsonData, // Your JSON data
                }),
            });

            } catch (error) {
                this.notification.add(
                        _t("לא ניתן היה להתחבר למסוף התשלום. אנא בדוק את חיבור הרשת או את הגדרות ה-IP שלך"),
                        { type: "danger" }
                    );
                    return; // Stop execution due to error
            } 
            await new Promise(resolve => setTimeout(resolve, 10000));
                    const jsonData = {
                        data: {
                            time: formattedTime, // Gets the current date and time in local format
                            ipAddress: api_key // Replace with dynamic IP fetching if needed
                        },
                        "body": {
                            jsonrpc: "2.0",
                            method: "doTransactionPhase2",
                            params: [
                                "ashrait",
                                {
                                    "tranCode": 1,
                                    "creditTerms": selectedPaymentType.id,
                                    "payments":parsedNum,
                    
                                }
                            ],
                            "id": "952550747"
                        }                    
                    };
            const response = await fetch('/save-transaction', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: jsonData, // Your JSON data
                }),
            });
}
                }          
    } 
           

        }
        if (this.ui.isSmall) {
            this.dialog.add(NumberPopup, {
                title: _t("New amount"),
                buttons: enhancedButtons(),
                startingValue: this.env.utils.formatCurrency(paymentline.get_amount(), false),
                getPayload: (num) => {
                    this.props.updateSelectedPaymentline(parseFloat(num));
                },
            });
        }
    },

    async paymentNotification(result ,paymentline) {

        if (!result) { // Assume falsy value (null, undefined) indicates failed request
            this.notification.add(
                _t("לא ניתן היה להתחבר למסוף התשלום. אנא בדוק את חיבור הרשת או את הגדרות ה-IP שלך"),
                { type: "danger" }
            );}
        else {if (result.result.statusCode == 0) {
            this.selectedPaymentLines.push(paymentline);
            await this.checkPaymentLinesAmountSum(this.selectedPaymentLines);
            this.notification.add(
                _t("התשלום הושלם בהצלחה."),
                {
                    type: "success",
                    sticky: true,

                }
            );
        }else {
            if (result.result.statusCode == 998) {
                console.log('sendPaymentCancel')
                this.notification.add(
                    _t("העסקה בוטלה על ידי מסוף התשלום."),
                    {
                        type: "danger",
                        sticky: true,
                    }
                );
                await this.props.deleteLine(paymentline.uuid);
            }else{
                
                console.log('sendPaymentCancel')
                this.notification.add(
                    _t("התשלום המקוון נכשל מהסיבה הבאה: " + result.result.statusMessage),
                    {
                        type: "danger",
                        sticky: true,
                    }
                );
            }
        }
        }
    },


    async checkPaymentLinesAmountSum(selectedPaymentLines) {
        // Calculate the total amount of selected payment lines
        const totalAmount = selectedPaymentLines.reduce((sum, line) => {
            return sum + line.get_amount();
        }, 0);
        console.log('****************************')
        const dueAmount = this.pos.currentOrder.getTotalDue();

        const roundedTotalAmount = Math.round(totalAmount * 100) / 100;
        const roundedDueAmount = Math.round(dueAmount * 100) / 100;

        // Log the amounts for debugging purposes
        console.log("Total of selected payment lines:", roundedTotalAmount);
        console.log("Due amount:", roundedDueAmount);

        // Check if the rounded amounts match
        if (roundedTotalAmount == roundedDueAmount) {
            // If the amounts match, activate the validateOrder method
            console.log("Amount matches, validating order.");
            this.pos.validateOrder()

        } else {
            // If the amounts don't match, do nothing
            console.log("Amount does not match due amount.");
        }
    },

}

);
