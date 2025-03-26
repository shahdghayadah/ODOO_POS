odoo.define('plu_report.custom', function (require) {
    "use strict";

    var FormController = require('web.FormController');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var QWeb = core.qweb;

    FormController.include({
        buttons_template: 'MyButtons', // Name of the QWeb template for buttons
        events: _.extend({}, FormController.prototype.events, {
            'click .o_plu_custom_save': '_onCustomSave', // Click event for Save button
        }),

        _onCustomSave: function () {
            var self = this;
            this.saveRecord().then(function () {
                // Optional:  Display a success message or redirect
                self.do_notify("Success", "PLU record saved successfully!", true);
            });
        },

        _onLoadRecord: function (record) {
            var self = this;
            this._super.apply(this, arguments);
            this._getCategories().then(function (categories) {
                self.categories = categories;
                self.renderCategoryList();
            });
        },

        _getCategories: function () {
            return rpc.query({
                model: 'product.category',
                method: 'search_read',
                args: [[], ['name']], // Fetch all categories, only their names
            });
        },

        renderCategoryList: function () {
            var self = this;
            var $target = this.$('#category_list_container');
            if ($target.length) {
                // Render the QWeb template
                var html = QWeb.render('category_list_template', {
                    categories: self.categories,
                });
                $target.html(html);  // Inject the rendered HTML into the DOM
            }
        },
    });
});