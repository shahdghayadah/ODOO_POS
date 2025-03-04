
import { PosOrder } from '@point_of_sale/app/models/pos_order';
import { patch } from "@web/core/utils/patch";

patch(PosOrder.prototype, {

add_paymentline(payment_method) {
        console.log('EEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE')
        this.assert_editable();
        if (this.electronic_payment_in_progress()) {
            return false;
        } else {
            const newPaymentline = this.models["pos.payment"].create({
                pos_order_id: this,
                payment_method_id: payment_method,
            });

            this.select_paymentline(newPaymentline);
            if (this.config.cash_rounding) {
                newPaymentline.set_amount(0);
            }
            newPaymentline.set_amount(this.get_due());

            if (
                payment_method.payment_terminal ||
                payment_method.payment_method_type === "qr_code"
            ) {
                newPaymentline.set_payment_status("pending");
            }
            return newPaymentline;
        }
    }

});