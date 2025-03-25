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
        const line = this.props.line;
        // Get the actual orderline object from the POS order
        const order = this.pos.get_order();
        const orderline = order.get_selected_orderline();
        
        if (orderline) {
            // Get current quantity and increase by 1
            const currentQty = orderline.get_quantity();
            orderline.set_quantity(currentQty + 1);
            
            // Update UI - remove disabled class from minus button
            const minusButton = this.el.querySelector('.qty-button.minus');
            if (minusButton) {
                minusButton.classList.remove('disabled');
            }
        }
    },

    decrementQty() {
        const line = this.props.line;
        const order = this.pos.get_order();
        const orderline = order.get_selected_orderline();
        
        if (orderline) {
            const currentQty = orderline.get_quantity();
            
            if (currentQty > 1) {
                // Decrease quantity if more than 1
                orderline.set_quantity(currentQty - 1);
                
                // If quantity is now 1, disable the minus button
                if (currentQty - 1 === 1) {
                    const minusButton = this.el.querySelector('.qty-button.minus');
                    if (minusButton) {
                        minusButton.classList.add('disabled');
                    }
                }
            } else {
                // Remove line if quantity would be 0
                order.remove_orderline(orderline);
            }
        }
    },
    
    // Update XML template to properly show disabled state
    mounted() {
        super.mounted && super.mounted();
        this.updateButtonState();
    },
    
    willUpdateProps() {
        super.willUpdateProps && super.willUpdateProps();
        this.updateButtonState();
    },
    
    updateButtonState() {
        if (!this.el) return;
        
        // Check if current line is selected
        const line = this.props.line;
        const order = this.pos.get_order();
        const selectedLine = order.get_selected_orderline();
        const isSelected = selectedLine && selectedLine.id === line.id;
        
        // Add/remove selected class to control visibility
        if (isSelected) {
            this.el.classList.add('selected');
        } else {
            this.el.classList.remove('selected');
        }
        
        // Check quantity for minus button state
        if (isSelected) {
            const qty = line.get_quantity();
            const minusButton = this.el.querySelector('.qty-button.minus');
            if (minusButton) {
                if (qty <= 1) {
                    minusButton.classList.add('disabled');
                } else {
                    minusButton.classList.remove('disabled');
                }
            }
        }
    }
});