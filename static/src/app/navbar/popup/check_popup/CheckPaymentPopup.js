import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";

export class CheckPaymentPopup extends Component {
    static template = "point_of_sale1.CheckPaymentPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        confirm: { type: Function },
        close: { type: Function },
        getPayload: { type: Function, optional: true },
    };

    setup() {
        this.state = useState({
            checkNumber: '',
            checkDate: '',
            customerName: '',
        });
    }

    onCheckNumberChange(ev) {
        this.state.checkNumber = ev.target.value;
    }

    onCheckDateChange(ev) {
        this.state.checkDate = ev.target.value;
    }

    onCustomerNameChange(ev) {
        this.state.customerName = ev.target.value;
    }



    onConfirm() {
        const { checkNumber, checkDate, customerName } = this.state;
        if (!checkNumber || !checkDate || !customerName ) {
            this.props.confirm({ confirmed: false, error: "Fill all fields" });
            return;
        }



        this.props.confirm({
            confirmed: true,
            payload: { checkNumber, checkDate, customerName }
        });
        this.props.close();
    }

    onCancel() {
        this.props.confirm({ confirmed: false });
        this.props.close();
    }
}