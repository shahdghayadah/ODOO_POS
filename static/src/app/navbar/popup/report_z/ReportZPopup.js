import { Component, useState } from "@odoo/owl";
import { Dialog } from "@web/core/dialog/dialog";
 
export class ReportZPopup extends Component {
    static template = "point_of_sale1.ReportZPopup";
    static components = { Dialog };
    static props = {
        title: { type: String, optional: true },
        confirm: { type: Function },
        close: { type: Function },
        getPayload: { type: Function, optional: true },
    };
 
    setup() {
        this.state = useState({
            dateFrom: '',
            dateTo: '',
        });
    }
 
    onDateFromChange(ev) {
        this.state.dateFrom = ev.target.value;
    }
 
 
 
    onDateToChange(ev) {
        this.state.dateTo = ev.target.value;
    }
 

    onConfirm() {
        const { dateFrom, dateTo } = this.state;
        if (!dateFrom  || !dateTo ) {
            this.props.confirm({ confirmed: false, error: "Fill all fields" });
            return;
        }
        this.props.confirm({
            confirmed: true,
            payload: { dateFrom, dateTo }
        });
        this.props.close();
    }
 
    onCancel() {
        this.props.confirm({ confirmed: false });
        this.props.close();
    }
}
 