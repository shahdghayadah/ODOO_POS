import { PosStore } from '@point_of_sale/app/store/pos_store';
import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { makeAwaitable } from "@point_of_sale/app/store/make_awaitable_dialog";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { ComboConfiguratorPopup } from "@point_of_sale/app/store/combo_configurator_popup/combo_configurator_popup";
import { computeComboItems } from "@point_of_sale/app/models/utils/compute_combo_items";
import { NumberPopup } from "@point_of_sale/app/utils/input_popups/number_popup";

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
},
async addLineToOrder(vals, order, opts = {}, configure = true) {//rami edits to add the weight PLU report
    let merge = true;
    order.assert_editable();
    let plu_weight = null;
    if (vals.product_id) {
        if(vals.product_id.raw && vals.product_id.raw.plu_weight) {
            plu_weight = vals.product_id.raw.plu_weight;
        }
        if(vals.product_id.plu_weight){
            plu_weight = vals.product_id.plu_weight;

            delete vals.product_id.plu_weight;
        }
      }
    const options = {
        ...opts,
    };

    if ("price_unit" in vals) {
        merge = false;
    }

    if (typeof vals.product_id == "number") {
        vals.product_id = this.data.models["product.product"].get(vals.product_id);
    }
    const product = vals.product_id;

    const values = {
        price_type: "price_unit" in vals ? "manual" : "original",
        price_extra: 0,
        price_unit: 0,
        order_id: this.get_order(),
        qty: plu_weight || 1,
        tax_ids: product.taxes_id.map((tax) => ["link", tax]),
        ...vals,
    };
    delete vals.product_id.plu_weight;

    // Handle refund constraints
    if (
        order.doNotAllowRefundAndSales() &&
        order._isRefundOrder() &&
        (!values.qty || values.qty > 0)
    ) {
        this.dialog.add(AlertDialog, {
            title: _t("Refund and Sales not allowed"),
            body: _t("It is not allowed to mix refunds and sales"),
        });
        return;
    }
            // In case of configurable product a popup will be shown to the user
            // We assign the payload to the current values object.
            // ---
            // This actions cannot be handled inside pos_order.js or pos_order_line.js
            if (values.product_id.isConfigurable() && configure) {
                const payload = await this.openConfigurator(values.product_id);
    
                if (payload) {
                    const productFound = this.models["product.product"]
                        .filter((p) => p.raw?.product_template_variant_value_ids?.length > 0)
                        .find((p) =>
                            p.raw.product_template_variant_value_ids.every((v) =>
                                payload.attribute_value_ids.includes(v)
                            )
                        );
    
                    Object.assign(values, {
                        attribute_value_ids: payload.attribute_value_ids
                            .filter((a) => {
                                if (productFound) {
                                    const attr =
                                        this.data.models["product.template.attribute.value"].get(a);
                                    return (
                                        attr.is_custom || attr.attribute_id.create_variant !== "always"
                                    );
                                }
                                return true;
                            })
                            .map((id) => [
                                "link",
                                this.data.models["product.template.attribute.value"].get(id),
                            ]),
                        custom_attribute_value_ids: Object.entries(payload.attribute_custom_values).map(
                            ([id, cus]) => {
                                return [
                                    "create",
                                    {
                                        custom_product_template_attribute_value_id:
                                            this.data.models["product.template.attribute.value"].get(
                                                id
                                            ),
                                        custom_value: cus,
                                    },
                                ];
                            }
                        ),
                        price_extra: values.price_extra + payload.price_extra,
                        qty: payload.qty || values.qty,
                        product_id: productFound || values.product_id,
                    });
                } else {
                    return;
                }
            } else if (values.product_id.product_template_variant_value_ids.length > 0) {
                // Verify price extra of variant products
                const priceExtra = values.product_id.product_template_variant_value_ids
                    .filter((attr) => attr.attribute_id.create_variant !== "always")
                    .reduce((acc, attr) => acc + attr.price_extra, 0);
                values.price_extra += priceExtra;
            }
            else if (values.product_id.to_weight && configure) {
                const weight = await makeAwaitable(this.dialog, NumberPopup, {  
                    title: _t("Enter Weight"),
                    subtitle: _t("Please enter the weight for ") + values.product_id.display_name,
                    startingValue: "1.000",
                    confirmButtonLabel: _t("Confirm"),
                    close: () => null,  // Ensure that closing the popup does not return a value
                });
            
                // Check if the user discarded the input (pressed cancel/close)
                if (weight === null || weight === undefined) {
                    console.log("Weight input was discarded.");
                    return; // Stop execution, preventing `values.qty` from updating
                }
            
                console.log("Weight entered:", weight);
                const parsedWeight = parseFloat(weight);
            
                if (isNaN(parsedWeight) || parsedWeight <= 0) {
                    await this.dialog.add(AlertDialog, {
                        title: _t("Invalid Weight"),
                        body: _t("Please enter a valid weight (greater than 0)."),
                    });
                    return; // Stop execution, preventing `values.qty` from updating

                } else {
                    values.qty = parsedWeight; // Assign valid weight to `values.qty`
                }
            }
            
            
            // if (values.product_id.to_weight && configure) {
            //     const payload = await makeAwaitable(this.dialog, NumberPopup, {  // Removed promise and await it directly
            //         title: ('Enter Weight'),
            //         subtitle: ('Please enter the weight for ') + values.product_id.display_name,
            //         startingValue: '1.000',
            //         confirmButtonLabel: ("Confirm"),
            //         confirm: () => {
            //             console.log('weight', payload);
            //             const parsedWeight = parseFloat(payload);
            //             console.log('parsedWeight', parsedWeight);
            //             // if (isNaN(parsedWeight) || parsedWeight <= 0) {
            //             //     self.dialog.add(AlertDialog, {
            //             //         title: ('Invalid Weight'),
            //             //         body:('Please enter a valid weight (greater than 0).'),
            //             //     });
            //             //     return; // Cancel the operation
            //             // }
            //             // values.qty = weight;

            //         },
            //     });
            //     const parsedWeight = parseFloat(payload);

            //     if (!isNaN(parsedWeight) && parsedWeight >=1) {
            //         values.qty = parsedWeight; 
            //     }
                
            //     // await this.dialog.add(NumberPopup, {  // Removed promise and await it directly
            //     //     title: ('Enter Weight'),
            //     //     subtitle: ('Please enter the weight for ') + values.product_id.display_name,
            //     //     startingValue: '1.000',
            //     //     confirmButtonLabel: ("Confirm"),
            //     //     close: () => {
            //     //         //Nothing should happen here, the quantity should not be modified
            //     //     },
            //     //     getPayload: (weight) => {
            //     //         console.log('weight', weight);
            //     //         const parsedWeight = parseFloat(weight);
            //     //         if (isNaN(parsedWeight) || parsedWeight <= 0) {
            //     //             self.dialog.add(AlertDialog, {
            //     //                 title: ('Invalid Weight'),
            //     //                 body:('Please enter a valid weight (greater than 0).'),
            //     //             });
            //     //             return; // Cancel the operation
            //     //         }
            //     //         console.log('parsedWeight', parsedWeight);
            //     //         values.qty = weight;

            //     //     },
            //     // });
            // }
            // In case of clicking a combo product a popup will be shown to the user
            // It will return the combo prices and the selected products
            // ---
            // This actions cannot be handled inside pos_order.js or pos_order_line.js
            if (values.product_id.isCombo() && configure) {
                const payload = await makeAwaitable(this.dialog, ComboConfiguratorPopup, {
                    product: values.product_id,
                });
    
                if (!payload) {
                    return;
                }
    
                const comboPrices = computeComboItems(
                    values.product_id,
                    payload,
                    order.pricelist_id,
                    this.data.models["decimal.precision"].getAll(),
                    this.data.models["product.template.attribute.value"].getAllBy("id")
                );
    
                values.combo_line_ids = comboPrices.map((comboItem) => [
                    "create",
                    {
                        product_id: comboItem.combo_item_id.product_id,
                        tax_ids: comboItem.combo_item_id.product_id.taxes_id.map((tax) => [
                            "link",
                            tax,
                        ]),
                        combo_item_id: comboItem.combo_item_id,
                        price_unit: comboItem.price_unit,
                        order_id: order,
                        qty: 1,
                        attribute_value_ids: comboItem.attribute_value_ids?.map((attr) => [
                            "link",
                            attr,
                        ]),
                        custom_attribute_value_ids: Object.entries(
                            comboItem.attribute_custom_values
                        ).map(([id, cus]) => {
                            return [
                                "create",
                                {
                                    custom_product_template_attribute_value_id:
                                        this.data.models["product.template.attribute.value"].get(id),
                                    custom_value: cus,
                                },
                            ];
                        }),
                    },
                ]);
            }
    
            // In the case of a product with tracking enabled, we need to ask the user for the lot/serial number.
            // It will return an instance of pos.pack.operation.lot
            // ---
            // This actions cannot be handled inside pos_order.js or pos_order_line.js
            const code = opts.code;
            if (values.product_id.isTracked() && (configure || code)) {
                let pack_lot_ids = {};
                const packLotLinesToEdit =
                    (!values.product_id.isAllowOnlyOneLot() &&
                        this.get_order()
                            .get_orderlines()
                            .filter((line) => !line.get_discount())
                            .find((line) => line.product_id.id === values.product_id.id)
                            ?.getPackLotLinesToEdit()) ||
                    [];
    
                // if the lot information exists in the barcode, we don't need to ask it from the user.
                if (code && code.type === "lot") {
                    // consider the old and new packlot lines
                    const modifiedPackLotLines = Object.fromEntries(
                        packLotLinesToEdit.filter((item) => item.id).map((item) => [item.id, item.text])
                    );
                    const newPackLotLines = [{ lot_name: code.code }];
                    pack_lot_ids = { modifiedPackLotLines, newPackLotLines };
                } else {
                    pack_lot_ids = await this.editLots(values.product_id, packLotLinesToEdit);
                }
    
                if (!pack_lot_ids) {
                    return;
                } else {
                    const packLotLine = pack_lot_ids.newPackLotLines;
                    values.pack_lot_ids = packLotLine.map((lot) => ["create", lot]);
                }
            }
    
            // In case of clicking a product with tracking weight enabled a popup will be shown to the user
            // It will return the weight of the product as quantity
            // ---
            // This actions cannot be handled inside pos_order.js or pos_order_line.js
           
         
            // Handle price unit
            if (!values.product_id.isCombo() && vals.price_unit === undefined) {
                values.price_unit = values.product_id.get_price(order.pricelist_id, values.qty);
            }
            const isScannedProduct = opts.code && opts.code.type === "product";
            if (values.price_extra && !isScannedProduct) {
                const price = values.product_id.get_price(
                    order.pricelist_id,
                    values.qty,
                    values.price_extra
                );
    
                values.price_unit = price;
            }
    
            const line = this.data.models["pos.order.line"].create({ ...values, order_id: order });
            line.setOptions(options);
            this.selectOrderLine(order, line);
            if (configure) {
                this.numberBuffer.reset();
            }
            const selectedOrderline = order.get_selected_orderline();
            if (options.draftPackLotLines && configure) {
                selectedOrderline.setPackLotLines({
                    ...options.draftPackLotLines,
                    setQuantity: options.quantity === undefined,
                });
            }
    
            let to_merge_orderline;
            for (const curLine of order.lines) {
                if (curLine.id !== line.id) {
                    if (curLine.can_be_merged_with(line) && merge !== false) {
                        to_merge_orderline = curLine;
                    }
                }
            }
    
            if (to_merge_orderline) {
                to_merge_orderline.merge(line);
                line.delete();
                this.selectOrderLine(order, to_merge_orderline);
            } else if (!selectedOrderline) {
                this.selectOrderLine(order, order.get_last_orderline());
            }
    
            if (configure) {
                this.numberBuffer.reset();
            }
    
            // FIXME: Put this in an effect so that we don't have to call it manually.
            order.recomputeOrderData();
    
            if (configure) {
                this.numberBuffer.reset();
            }
    
            this.hasJustAddedProduct = true;
            clearTimeout(this.productReminderTimeout);
            this.productReminderTimeout = setTimeout(() => {
                this.hasJustAddedProduct = false;
            }, 3000);
    
            // FIXME: If merged with another line, this returned object is useless.
            return line;
        
        }
});