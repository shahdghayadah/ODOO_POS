import { PosStore } from '@point_of_sale/app/store/pos_store';
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";


// customizing the selectOrderLine method to set the numpadMode to "price" when a line is selected 
patch(PosStore.prototype, {

selectOrderLine(order, line) {
    order.select_orderline(line);
    this.numpadMode = "price";
} ,

getReceiptHeaderData(order) {
    return {
        company: this.company,
        cashier: _t("Served by %s", order?.getCashierName() || this.get_cashier()?.name),
        header: this.config.receipt_header,
        order: order,
    };
}
});