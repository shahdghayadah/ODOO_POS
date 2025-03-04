import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
 
export class BankTransferPopup extends Component {
    static template = "point_of_sale1.BankTransferPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        confirm: { type: Function },
        close: { type: Function },
        getPayload: { type: Function, optional: true },
    };
 
    setup() {
        this.state = useState({
            reference: '',
            transferDate: '',
            customerName: '',
        });
    }
 
    onCardNumberChange(ev) {
        this.state.reference = ev.target.value;
    }
 
 

    onCustomerNameChange(ev) {
        this.state.customerName = ev.target.value;
    }
    onExpirationDateChange(ev) {
        this.state.transferDate = ev.target.value;
    }
 

    onConfirm() {
        const { reference, transferDate   ,customerName } = this.state;
        if (!reference  || !transferDate  || !customerName) {
            this.props.confirm({ confirmed: false, error: "Fill all fields" });
            return;
        }
        this.props.confirm({
            confirmed: true,
            payload: { reference, transferDate    ,customerName}
        });
        this.props.close();
    }
 
    onCancel() {
        this.props.confirm({ confirmed: false });
        this.props.close();
    }
}
 