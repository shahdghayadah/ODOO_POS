import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
 
export class BitPaymentPopup extends Component {
    static template = "point_of_sale1.BitPaymentPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        confirm: { type: Function },
        close: { type: Function },
        getPayload: { type: Function, optional: true },
    };
 
    setup() {
        this.state = useState({
            phoneNumber: '',
            expirationDate: '',
        });
    }
 
    onPhoneNumberChange(ev) {
        this.state.phoneNumber = ev.target.value;
    }
 
 
 
    onExpirationDateChange(ev) {
        this.state.expirationDate = ev.target.value;
    }
 

    onConfirm() {
        const { phoneNumber, expirationDate } = this.state;
        if (!phoneNumber  || !expirationDate ) {
            this.props.confirm({ confirmed: false, error: "Fill all fields" });
            return;
        }
        this.props.confirm({
            confirmed: true,
            payload: { phoneNumber, expirationDate }
        });
        this.props.close();
    }
 
    onCancel() {
        this.props.confirm({ confirmed: false });
        this.props.close();
    }
}
 