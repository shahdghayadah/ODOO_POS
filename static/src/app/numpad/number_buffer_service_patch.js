/** @odoo-module **/

import { parseFloat as oParseFloat } from "@web/views/fields/parsers";
import { barcodeService } from "@barcodes/barcode_service";
import { registry } from "@web/core/registry";
import { session } from "@web/session";
import { EventBus, onWillDestroy, useComponent } from "@odoo/owl";

// Modified constants with +100 and +200 added
const INPUT_KEYS = new Set(
    ["Delete", "Backspace", "+1", "+2", "+5", "+10", "+20", "+50", "+100", "+200"].concat(
        "0123456789+-.,".split("")
    )
);
const CONTROL_KEYS = new Set(["Enter", "Esc"]);
const ALLOWED_KEYS = new Set([...INPUT_KEYS, ...CONTROL_KEYS]);
const getDefaultConfig = () => ({
    decimalPoint: false,
    triggerAtEnter: false,
    triggerAtEsc: false,
    triggerAtInput: false,
    useWithBarcode: false,
});

class NumberBuffer extends EventBus {
    static serviceDependencies = ["mail.sound_effects", "localization"];
    
    constructor() {
        super();
        this.setup(...arguments);
    }

    setup(services) {
        this.isReset = false;
        this.bufferHolderStack = [];
        this.sound = services["mail.sound_effects"];
        this.defaultDecimalPoint = services.localization.decimalPoint;
        window.addEventListener("keyup", this._onKeyboardInput.bind(this));
    }

    get() {
        return this.state ? this.state.buffer : null;
    }

    set(val) {
        this.state.buffer = !isNaN(parseFloat(val)) ? val : "";
        this.trigger("buffer-update", this.state.buffer);
    }

    reset() {
        this.isReset = true;
        this.state.buffer = "";
        this.trigger("buffer-update", this.state.buffer);
    }

    capture() {
        if (this.handler) {
            clearTimeout(this._timeout);
            this.handler(true);
            delete this.handler;
        }
    }

    getFloat() {
        return oParseFloat(this.get());
    }

    use(config) {
        this.eventsBuffer = [];
        const currentComponent = useComponent();
        config = Object.assign(getDefaultConfig(), config);

        this.bufferHolderStack.push({
            component: currentComponent,
            state: config.state ? config.state : { buffer: "", toStartOver: false },
            config,
        });
        this._setUp();
        onWillDestroy(() => {
            const currentComponentName = currentComponent.constructor.name;
            const indexComponent = this.bufferHolderStack.findIndex(
                (stack) => stack.component.constructor.name === currentComponentName
            );
            this.bufferHolderStack.splice(indexComponent, 1);
            this._setUp();
        });
    }

    get _currentBufferHolder() {
        return this.bufferHolderStack[this.bufferHolderStack.length - 1];
    }

    _setUp() {
        if (!this._currentBufferHolder) {
            return;
        }
        const { component, state, config } = this._currentBufferHolder;
        this.component = component;
        this.state = state;
        this.config = config;
        this.decimalPoint = config.decimalPoint || this.defaultDecimalPoint;
        this.maxTimeBetweenKeys = this.config.useWithBarcode
            ? barcodeService.maxTimeBetweenKeysInMs
            : 0;
    }

    _onKeyboardInput(event) {
        return (
            this._currentBufferHolder &&
            this._bufferEvents(this._onInput((event) => event.key))(event)
        );
    }

    sendKey(key) {
        const event = new CustomEvent("", {
            detail: {
                key: key,
            },
        });
        Object.defineProperty(event, "target", { value: {} });

        return this._bufferEvents(this._onInput((event) => event.detail.key))(event);
    }

    _bufferEvents(handler) {
        return (event) => {
            if (["INPUT", "TEXTAREA"].includes(event.target.tagName) || !this.eventsBuffer) {
                return;
            }
            clearTimeout(this._timeout);
            this.eventsBuffer.push(event);
            this._timeout = setTimeout(handler, this.maxTimeBetweenKeys);
            this.handler = handler;
        };
    }

    _onInput(keyAccessor) {
        return (manualCapture = false) => {
            if (
                manualCapture ||
                session.test_mode ||
                (!manualCapture && this.eventsBuffer.length <= 2)
            ) {
                for (const event of this.eventsBuffer) {
                    if (!ALLOWED_KEYS.has(keyAccessor(event))) {
                        this.eventsBuffer = [];
                        return;
                    }
                }
                for (const event of this.eventsBuffer) {
                    this._handleInput(keyAccessor(event));
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
            this.eventsBuffer = [];
        };
    }

    _handleInput(key) {
        if (key === "Enter" && this.config.triggerAtEnter) {
            this.config.triggerAtEnter(this.state);
        } else if (key === "Esc" && this.config.triggerAtEsc) {
            this.config.triggerAtEsc(this.state);
        } else if (INPUT_KEYS.has(key)) {
            this._updateBuffer(key);
            if (this.config.triggerAtInput) {
                this.config.triggerAtInput({
                    buffer: this.state.buffer,
                    key,
                });
            }
        }
    }

    _updateBuffer(input) {
        const isEmpty = (val) => val === "" || val === null;
        
        if (input === undefined || input === null) return;

        const isFirstInput = isEmpty(this.state.buffer);

        if (input === "," || input === ".") {
            if (this.state.toStartOver) this.state.buffer = "";
            if (isFirstInput) {
                this.state.buffer = "0" + this.decimalPoint;
            } else if (!this.state.buffer.length || this.state.buffer === "-") {
                this.state.buffer += "0" + this.decimalPoint;
            } else if (this.state.buffer.indexOf(this.decimalPoint) < 0) {
                this.state.buffer += this.decimalPoint;
            }
        } 
        else if (input === "Delete") {
            this.state.buffer = this.isReset ? "" : (isEmpty(this.state.buffer) ? null : "");
            this.isReset = false;
        } 
        else if (input === "Backspace") {
            if (this.isReset) {
                this.state.buffer = "";
                this.isReset = false;
                return;
            }
            if (this.state.toStartOver) this.state.buffer = "";
            const buffer = this.state.buffer;
            if (isEmpty(buffer)) {
                this.state.buffer = null;
            } else {
                const nCharToRemove = buffer[buffer.length - 1] === this.decimalPoint ? 2 : 1;
                this.state.buffer = buffer.substring(0, buffer.length - nCharToRemove);
            }
        } 
        else if (input === "+") {
            if (this.state.buffer[0] === "-") {
                this.state.buffer = this.state.buffer.substring(1);
            }
        } 
        else if (input === "-") {
            if (isFirstInput) {
                this.state.buffer = "-0";
            } else if (this.state.buffer[0] === "-") {
                this.state.buffer = this.state.buffer.substring(1);
            } else {
                this.state.buffer = "-" + this.state.buffer;
            }
        } 
        else if (input[0] === "+" && !isNaN(parseFloat(input))) {
            // Handle +100 and +200 along with other increment values
            const inputValue = oParseFloat(input.slice(1));
            const currentBufferValue = this.state.buffer ? oParseFloat(this.state.buffer) : 0;
            this.state.buffer = this.component.env.utils.formatCurrency(
                inputValue + currentBufferValue,
                false
            );
        } 
        else if (!isNaN(parseInt(input, 10))) {
            if (this.state.toStartOver) this.state.buffer = "";
            if (isFirstInput) {
                this.state.buffer = input;
            } else if (this.state.buffer.length > 12) {
                this.sound.play("bell");
            } else {
                this.state.buffer += input;
            }
        }

        if (this.state.buffer === "-") this.state.buffer = "";
        this.isReset = false;
        this.state.toStartOver = false;
        this.trigger("buffer-update", this.state.buffer);
    }
}

// Export and register the service with force override
export const numberBufferService = {
    dependencies: NumberBuffer.serviceDependencies,
    start(env, deps) {
        return new NumberBuffer(deps);
    },
};

registry.category("services").add("number_buffer", numberBufferService, { force: true });