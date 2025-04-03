import { _t } from "@web/core/l10n/translation";
import { ProductScreen } from '@point_of_sale/app/screens/product_screen/product_screen';
import { patch } from "@web/core/utils/patch";
import { rpc } from "@web/core/network/rpc";
import { useService } from "@web/core/utils/hooks";
// Apply the patch early in the process
patch(ProductScreen.prototype, {
    setup() {
        super.setup();
        this.state.paymentButtonDisabled = false;
        this._setupPartnerListener();
        this.loyaltyButtonClicked = false;
        this.orm = useService("orm");

        this.showCategories= null ;
        // Set default category when initializing
        this._setDefaultCategory();
        const orm = useService("orm");
        const pos = useService("pos");
        
         const categories = pos.models['pos.category'].records;
         const sub= categories["pos.category"];
         const categoriesArray = Array.from(sub.values());

         categoriesArray.forEach((value, key) => {
            console.log(`Category ID: ${key}`, value.sequence,value.id);
        });
// const matchingCategories = categoriesArray.filter(value => value.sequence === 0);
this.matchingCategoryIds = categoriesArray
.filter(value => value.sequence === 0)
.map(value => value.id);

// console.log(matchingCategories);

    },
    async _setDefaultCategory() {
        // Replace 5 with your actual default category ID
        const pos = useService("pos");

        const orm = useService("orm");

        const result =  await this.orm.searchRead("res.config.settings", [], ['AllowDefault']);
        
        const apiUrl = result[0].AllowDefault;
        const result2 = await this.orm.searchRead(
            "res.config.settings",
            [],  // No domain filter
            ['AllowDefault'],  // Fields to fetch
            {
                order: "id DESC",  // Newest first
                limit: 1,          // Only fetch the latest record
            }
        );
    const showCategoriesBar    =  await this.orm.searchRead(
            "res.config.settings",
            [],  // No domain filter
            ['ShowCategoriesBar'],  // Fields to fetch
            {
                order: "id DESC",  // Newest first
                limit: 1,          // Only fetch the latest record
            }
        );
        this.showCategories=showCategoriesBar[0].ShowCategoriesBar;
        const latestAllowDefault = result2[0]?.AllowDefault;
        if(latestAllowDefault){
        // Extract categories from pos
        const categories = pos.models['pos.category'].records;

        const sub = categories["pos.category"];
        const categoriesArray = Array.from(sub.values());

        // Store only the IDs of categories with sequence === 0
        this.matchingCategoryIds = categoriesArray
            .filter(value => value.sequence === 0)
            .map(value => value.id);

        const defaultCategoryId =this.matchingCategoryIds[0];
                setTimeout(() => {
            if (this.pos) {
                this.pos.setSelectedCategory(defaultCategoryId);
                
                // Force refresh the product list
                this.render(true);
            }
        }, 100); // Small timeout to ensure POS is fully initialized
     } },
    
    // Override getProductsToDisplay to filter by default category initially
    async getProductsToDisplay() {
        let products = super.getProductsToDisplay();
        const orm = useService("orm");
        const result =  await this.orm.searchRead("res.config.settings", [], ['AllowDefault']);
        const apiUrl = result[13].AllowDefault;
        // If no category is explicitly selected yet, filter by default category
        if (!this.pos.selectedCategoryId) {
            const pos = useService("pos");

    
            // Extract categories from pos
            const categories = pos.models['pos.category'].records;
    
            const sub = categories["pos.category"];
            const categoriesArray = Array.from(sub.values());
    
            // Store only the IDs of categories with sequence === 0
            this.matchingCategoryIds = categoriesArray
                .filter(value => value.sequence === 0)
                .map(value => value.id);
    
            console.log("Matching Category IDs:2", this.matchingCategoryIds[0]);
            const defaultCategoryId =this.matchingCategoryIds[0];            
            // Filter products that belong to the default category
            products = products.filter(product => 
                product.pos_categ_ids && 
                product.pos_categ_ids.includes(defaultCategoryId)
            );
        }
        
        return products;
    },
    _setupPartnerListener() {
        // Store the current partner phone for comparison
        this._lastPartnerPhone = null;
        
        // Set up an interval to check for changes
        this._partnerCheckInterval = setInterval(() => {
            const currentPhone = this.currentOrder?.get_partner()?.phone;
            
            // Only update if the phone status changed
            if (currentPhone !== this._lastPartnerPhone) {
                this._lastPartnerPhone = currentPhone;
                
                // Only disable if loyalty button hasn't been clicked
                if (!this.loyaltyButtonClicked) {
                    this.state.paymentButtonDisabled = !!currentPhone;
                }
                this.render(true);
            }
        }, 1000); // Check every second
    },

    // New method to listen for cart changes
    _setupCartChangeListener() {
        // We'll need to store the current cart state for comparison
        this._lastCartState = this._getCartState();
        
        // Set up an interval to check for cart changes
        this._cartCheckInterval = setInterval(() => {
            // Skip if there's no order
            if (!this.currentOrder) return;
            
            const currentCartState = this._getCartState();
            const hasPartnerPhone = !!this.currentOrder.get_partner()?.phone;
            
            // Check if cart has changed
            if (this._cartStateChanged(this._lastCartState, currentCartState)) {
                
                // If partner has phone, disable payment button on cart change
                // Only if loyalty button hasn't been clicked recently
                if (hasPartnerPhone ) {
                    this.state.paymentButtonDisabled = true;
                    
                    // Find and reset the loyalty button
                    const loyaltyButton = document.querySelector('.loyalty-api-button');
                    if (loyaltyButton) {
                        this.currentOrder.get_orderlines().forEach(orderLine => {
                            orderLine.set_discount(0);
                        });
                        loyaltyButton.dataset.click = "2";
                        loyaltyButton.textContent = "Check Points";
                    }
                    
                }
                
                // Reset the loyalty button clicked flag on cart changes
                // This ensures that after clicking loyalty button, 
                // a new cart change will again disable the payment button
                this.loyaltyButtonClicked = false;
                
                // Update the stored cart state
                this._lastCartState = currentCartState;
                this.render(true);
            }
        }, 500); // Check every half second for better responsiveness
    },
    
    // Helper method to get a representation of the current cart state
    _getCartState() {
        if (!this.currentOrder) return null;
        
        // Create a simple representation of the cart for comparison
        const orderLines = this.currentOrder.get_orderlines() || [];
        return orderLines.map(line => ({
            productId: line.get_product().id,
            quantity: line.get_quantity(),
            price: line.get_price_with_tax(),
            discount: line.get_discount()
        }));
    },
    
    // Helper method to check if cart state has changed
    _cartStateChanged(oldState, newState) {
   

        if (!oldState || !newState) return true;

        if (oldState.length !== newState.length) 
            
            return true
        
        else
        // Compare each line item
        for (let i = 0; i < oldState.length; i++) {
            const oldLine = oldState[i];
            const newLine = newState[i];
            
            if (oldLine.productId !== newLine.productId ||
                oldLine.quantity !== newLine.quantity||oldState.length!==newState.length) {
                return true;
            }
    
        }
        
        return false;
    },

    willUnmount() {
        // Clean up the intervals when component unmounts
        if (this._partnerCheckInterval) {
            clearInterval(this._partnerCheckInterval);
        }
        if (this._cartCheckInterval) {
            clearInterval(this._cartCheckInterval);
        }
    },

    async _onClickLoyaltyButton(event) {
        const button = event.currentTarget;
        const clickState = button.dataset.click;
        
        // Set the loyalty button clicked flag to true
        this.loyaltyButtonClicked = true;

        if (clickState === "2") {
            // "Check Points" was clicked
            button.textContent = "Checking Points...";
            this.state.paymentButtonDisabled = true; // Disable payment button during check
            
            await this._onClickLoyaltyButton2();
            
            button.dataset.click = "3";
            button.textContent = "Cancel Points";
            this.state.paymentButtonDisabled = false; // Enable payment button after successful check
        } else {
            // "Cancel Points" was clicked
            button.textContent = "Canceling Points...";
            this.state.paymentButtonDisabled = true; // Disable payment button during cancellation
            
            await this._onClickLoyaltyButton3();
            
            button.dataset.click = "2";
            button.textContent = "Check Points";
            this.state.paymentButtonDisabled = false; // Enable payment button after cancellation
        }
        
        // Trigger UI update
        this.render(true);
    },

    // Function to extract the 'code' parameter from the URL
    getAuthCodeFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const authCode = urlParams.get('code'); // Extract the 'code' value
        if (authCode) {
            return authCode;
        }
        return null;
    },
    async _handlePaymentButtonClick() {
        // You can add any custom logic here before proceeding to payment
        // Check if payment button is disabled
        if (this.state.paymentButtonDisabled) {
            return; // Do nothing if button is disabled
        }
        // Proceed with payment if not disabled
        await this.pos.pay();
    },
    async _onClickLoyaltyButton2() {
        
        // Get current order details
        const currentOrder = this.currentOrder
        // env.item_price
        if (!currentOrder) {
            console.error("No current order");
            return;
        }
        // Prepare the cart items from order lines
        const cartItems = currentOrder.get_orderlines().map(line => ({
            classification: "product",
            label: line.name,
            sku: line.productId,
            item_price: line.unitPrice,
            item_quantity: parseInt(line.quantity, 10),
            not_for_discount: 0  // You can modify this based on your needs
        }));
        // Prepare the request body
   
          // Create the base body structure
        const body = {
            "jsonrpc": "2.0",
            "method": "call",
            "params": {
                "biz_id": "123456",
                "phone": currentOrder.get_partner().phone,
                "cart_total": currentOrder.get_total_with_tax(), // Assuming you get the cart total here
                "currency": "ILS",
                "terminal_id": "xyz100",
                "cart_items": [] // Will be populated with order lines
            }
        };
        // Loop through order lines and populate the cart_items array
        currentOrder.get_orderlines().forEach((line) => {
            // line.set_discount(12);
            body.params.cart_items.push({
                "classification": "product",
                "label": line.get_product().display_name, // Get product name
                "sku": line.get_product().default_code,
                "item_price": line.price_unit, // Get total price per item
                "item_quantity": line.get_quantity_str(), // Get quantity as string
                "not_for_discount": 1 // Assuming no discount is allowed for this item
            });
        });

        // Log the body to the console for debugging
        try {
            const url = "/proxy/get_calculated_member_cart";

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body:JSON.stringify({
                    jsonrpc: "2.0",
                    method: "call",
                    params: body, // Your JSON data
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
       
            // Process the response and apply discounts
            if (data.result ) {
                this.currentOrder.Ref_ID=data.result.responseData.deal_id;
                const apiCartItems = data.result.responseData.cart_items;
                // Find all order lines that should have discounts
                currentOrder.get_orderlines().forEach(orderLine => {
                    const productSku = orderLine.get_product().default_code;
                    const apiItem = apiCartItems.find(item => item.sku === productSku);

                    if (apiItem) {
                   
                        // Calculate discount percentage if there's a price difference
                        // if (apiItem.modified_unit_price !== apiItem.original_unit_price) {
                            const discountPercentage = ((apiItem.original_unit_price - apiItem.modified_unit_price) / 
                                                     apiItem.original_unit_price) * 100;
                            
                            // Apply discount to the order line
                          //mariel 
                            orderLine.set_discount(12);
                           // orderLine.set_customer_note("loyality");
                   //     }
                    }
                });

                // Update order display
                currentOrder.trigger('change');

                // Show success message
                const discountAmount = data.result.responseData.original_total - 
                                      data.result.responseData.modified_total;
                
                this.showPopup('ConfirmPopup', {
                    title: _t('Loyalty Discounts Applied'),
                    body: _t(`Total discounts: ${discountAmount} ILS`),
                });
            } else {
              console.log(
                    'No discounts available for this order'
              )
            }

        } catch (error) {
            console.error("Error:", error);
           
        }
    },
    
    async _onClickLoyaltyButton3() {
        try {
            // Simulate API call to redeem points
            const currentOrder = this.currentOrder

            currentOrder.get_orderlines().forEach(orderLine => {
                orderLine.set_discount(0);
                this.currentOrder.Ref_ID="";
            });

            console.log("Points redeemed successfully");
        } catch (error) {
            console.error("Error redeeming points:", error);
        }
    },

    async _fetchLoyaltyPoints() {
        // Simulate an API call to fetch loyalty points
        return new Promise((resolve) => setTimeout(() => resolve({ points: 100 }), 1000));
    },

    async _redeemLoyaltyPoints() {
        // Simulate an API call to redeem loyalty points
        return new Promise((resolve) => setTimeout(() => resolve({ success: true }), 1000));
    },

    // Function to send the authorization code to the getInitialToken API
    
            
   
    // Manually trigger the onLoad method when the screen is initialized or loaded
    async onLoad() {
        window.alert("inside onLoad"); // Alert inside onLoad

       
    },

    // Ensure that the start method is properly calling onLoad after patching
    start() {
        window.alert("inside start method"); // Alert inside start method
        this._super(...arguments); // Make sure this calls the base start method
        this.onLoad(); // Manually trigger onLoad here
    }
},


);