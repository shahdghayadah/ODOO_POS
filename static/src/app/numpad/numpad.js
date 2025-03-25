/** @odoo-module */

import { patch } from "@web/core/utils/patch";
import { Numpad, BACKSPACE, ZERO, getButtons } from "@point_of_sale/app/generic_components/numpad/numpad";
import { useService } from "@web/core/utils/hooks";
import { localization } from "@web/core/l10n/localization";

export const DECIMAL = {
    get value() {
        return localization.decimalPoint;
    },
    class: "o_colorlist_item_color_transparent_6"
};
// Patch the class to add customButtons prop
patch(Numpad, {
    props: {
        ...Numpad.props,
        customButtons: { type: Boolean, optional: true },
    },
});

// Patch the instance methods
patch(Numpad.prototype, {
    setup() {
        this.numberBuffer = useService("number_buffer");
        // Bind the onClick handler to the component instance
        this.onClick = this.onClick.bind(this);
    },

    onClick(buttonValue) {
        if (this.props.onClick) {
            this.props.onClick(buttonValue);
        } else {
            this.numberBuffer.sendKey(buttonValue);
        }
    },

    get buttons() {
        if (this.props.customButtons) {
            const DEFAULT_LAST_ROW = [{ value: "-", text: "+/-" ,class:"o_colorlist_item_color_transparent_3"}, ZERO, DECIMAL];
            const rightColumn = [
                { value: "+10", class: "o_colorlist_item_color_transparent_1" },
                { value: "+20", class: "o_colorlist_item_color_transparent_1" },
                { value: "+50", class: "o_colorlist_item_color_transparent_1" },
                { value: "+100", class: "o_colorlist_item_color_transparent_1" },
                { value: "+200", class: "o_colorlist_item_color_transparent_1" },
                { ...BACKSPACE, class: "o_colorlist_item_color_transparent_3" }
            ];
            
            return [
                { value: "1" }, { value: "2" }, { value: "3" },
                { value: "4" }, { value: "5" }, { value: "6" },
                { value: "7" }, { value: "8" }, { value: "9" },
                ...DEFAULT_LAST_ROW,
                ...rightColumn.slice(0, 2),
                rightColumn[5],
                ...rightColumn.slice(2, 5)
            ];
        }
        return this.props.buttons || getButtons([DECIMAL, ZERO, BACKSPACE]);
    },

    get computedClass() {
        const baseClass = `d-grid numpad m-n1 ${this.props.class || ''}`;
        const colsClass = this.props.customButtons ? 'numpad-3-cols ' : 'numpad-4-cols';
        return `${baseClass} ${colsClass}`;
    }
});