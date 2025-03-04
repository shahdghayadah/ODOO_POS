import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
 
export class ManualPaymentPopup extends Component {
    static template = "point_of_sale1.ManualPaymentPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        confirm: { type: Function },
        close: { type: Function },
        getPayload: { type: Function, optional: true },
    };
 
    setup() {
        this.state = useState({
            cardNumber: '',
            cvv: '',
            expirationDate: '',
            cardHolderId: '', // New field
        });
    }
 
    onCardNumberChange(ev) {
        this.state.cardNumber = ev.target.value;
    }
 
    onCvvChange(ev) {
        this.state.cvv = ev.target.value;
    }
 
    onExpirationDateChange(ev) {
        this.state.expirationDate = ev.target.value;
    }
 
    onCardHolderIdChange(ev) {
        this.state.cardHolderId = ev.target.value;
    }
 
    onConfirm() {
        const { cardNumber, cvv, expirationDate, cardHolderId } = this.state;
        if (!cardNumber || !cvv || !expirationDate || !cardHolderId) {
            this.props.confirm({ confirmed: false, error: "Fill all fields" });
            return;
        }
        this.props.confirm({
            confirmed: true,
            payload: { cardNumber, cvv, expirationDate, cardHolderId }
        });
        this.props.close();
    }
 
    onCancel() {
        this.props.confirm({ confirmed: false });
        this.props.close();
    }
}
 