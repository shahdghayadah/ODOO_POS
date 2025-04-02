import { _t } from "@web/core/l10n/translation";
import { Orderline } from "@point_of_sale/app/generic_components/orderline/orderline";
import { patch } from "@web/core/utils/patch";
import { usePos } from "@point_of_sale/app/store/pos_hook";

patch(Orderline.prototype, {
    setup() {
        super.setup();
        this.pos = usePos();
    },

    incrementQty() {
        const order = this.pos.get_order();
        const orderline = order.get_selected_orderline();
        
        if (orderline) {
            // Get current quantity and increase by 1
            const currentQty = orderline.get_quantity();
            orderline.set_quantity(currentQty + 1);
            
            // Don't try to access DOM here - will be handled by reactive updates
        }
    },

    decrementQty() {
        const order = this.pos.get_order();
        const orderline = order.get_selected_orderline();
        
        if (orderline) {
            const currentQty = orderline.get_quantity();
            
            if (currentQty > 1) {
                // Decrease quantity if more than 1
                orderline.set_quantity(currentQty - 1);
                // DOM updates will be handled reactively
            } else {
                // Remove the line if quantity is 1
                // Try different method names based on Odoo version
                if (typeof order.remove_orderline === 'function') {
                    order.remove_orderline(orderline);
                } else if (typeof order.removeOrderline === 'function') {
                    order.removeOrderline(orderline);
                } else if (typeof order.remove_line === 'function') {
                    order.remove_line(orderline);
                } else {
                    // Fallback - set quantity to 0 which should remove the line in most implementations
                    orderline.set_quantity(0);
                }
            }
        }
    },
    
    // Let the CSS handle the disabled state based on data attributes
    onPatched() {
        this.updateButtonState();
    },
    
    onMounted() {
        this.updateButtonState();
    },
    
    updateButtonState() {
        if (!this.el) return;
        
        const line = this.props.line;
        const qty = line.get_quantity();
        
        // Set data attribute for quantity
        this.el.setAttribute('data-qty', qty);
        
        // Update disabled state via class only if we have the element
        const minusButton = this.el.querySelector('.qty-button.minus');
        if (minusButton) {
            if (qty <= 1) {
                minusButton.classList.add('disabled');
            } else {
                minusButton.classList.remove('disabled');
            }
        }
    }
});