import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { _t } from "@web/core/l10n/translation";
patch(ProductScreen.prototype, {
    async _getProductByBarcode(code) {
        console.log(`[DEBUG] Scanning barcode: ${code.base_code}`);
        
        try {
            console.log("[DEBUG] Calling backend find_product_by_barcode");
            
            // Call the backend using the proper POS API
            const response = await this.pos.data.call(
                "pos.session",
                "find_product_by_barcode",
                [this.pos.pos_session_id, code.base_code, this.pos.config.id]
            );
            
            console.log("[DEBUG] Backend response:", response);

            // Check for receipt data
            if (response?.pos_receipt) {
                console.log("[DEBUG] Processing receipt data:", response.pos_receipt);
                
                // SAFE ORDER LOOKUP - THREE DIFFERENT METHODS
                let order;
                
                // Method 1: Check pos.models first
                if (this.pos.models?.['pos.order']?.find) {
                    order = this.pos.models['pos.order'].find(
                        o => o.id === response.pos_receipt.id || 
                             o.pos_reference === response.pos_receipt.pos_reference
                    );
                    console.log("[DEBUG] Order lookup via models:", order);
                }
                
                // Method 2: Try db if not found
                if (!order && this.pos.db?.get_order_by_id) {
                    order = this.pos.db.get_order_by_id(response.pos_receipt.id) || 
                            this.pos.db.get_order_by_reference(response.pos_receipt.pos_reference);
                    console.log("[DEBUG] Order lookup via db:", order);
                }
                
                // Method 3: Fallback to orders list
                if (!order && this.pos.get_order_list) {
                    order = this.pos.get_order_list().find(
                        o => o.id === response.pos_receipt.id || 
                             o.pos_reference === response.pos_receipt.pos_reference
                    );
                    console.log("[DEBUG] Order lookup via get_order_list:", order);
                }

                if (order) {
                    console.log("[DEBUG] Found order, navigating to TicketScreen");
                    
                    // SAFE SCREEN NAVIGATION
                    if (typeof this.pos.showScreen === 'function') {
                        this.pos.showScreen('TicketScreen');
                    } else if (this.env.services?.gui?.showScreen) {
                        this.env.services.gui.showScreen('TicketScreen');
                    }
                    
                    // SAFE ORDER SELECTION
                    const ticketScreen = this.pos.getCurrentOrder()?.gui?.currentScreen;
                    if (ticketScreen?.state) {
                        ticketScreen.state.selectedOrder = order;
                        ticketScreen.state.selectedOrderlineIds = { [order.id]: order.lines[0]?.id || null };
                        ticketScreen.render();
                    }
                    
                    return false; // Prevent product handling
                } else {
                    console.warn("[DEBUG] Order not found in any database");
                }
            }

            // Handle normal product response
            if (response?.['product.product']?.length) {
                console.log("[DEBUG] Processing product data");
                return response['product.product'][0];
            }

            console.log("[DEBUG] No matching product or receipt found");
            return undefined;

        } catch (error) {
            console.error("[ERROR] Barcode scan failed:", error);
            this.pos.notification.add(_t("Scanning error occurred"), 3000);
            return undefined;
        }
    }
});