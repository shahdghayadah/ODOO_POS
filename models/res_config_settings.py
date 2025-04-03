from odoo import api, fields, models


class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # Fields for Nayax and Checks
    module_pos_nayax = fields.Boolean(
        string="Nayax",
        help="Enable this feature to activate the custom PoS functionality."
    )

    module_pos_Checks = fields.Boolean(
        string="Checks",
        help="Enable this feature to activate the custom PoS functionality Checks."
    )

    # Temporary fields for printer creation
    printer_API = fields.Char(string="Printer API", help="API of the printer.")


    AllowDefault = fields.Boolean(
        string="AllowDefault",
        help="Enable this feature to activate the Default Category functionality.",default=False,readonly=False, config_parameter='point_of_sale_1.AllowDefault'
    )
    ShowCategoriesBar=fields.Boolean(
        string="ShowCategoriesBar",
        help="Enable this feature to Show Categories Bar.",default=False,readonly=False, config_parameter='point_of_sale_1.ShowCategoriesBar'
    )
    @api.model
    def get_values(self):
        """Override to retrieve values stored in ir.config_parameter."""
        res = super(ResConfigSettings, self).get_values()
        # Fetching the saved printer API from the ir.config_parameter table
        res.update(
            printer_API=self.env['ir.config_parameter'].sudo().get_param('your_module.printer_API', default='')
        )
        return res

    def set_values(self):
        """Override to save values in ir.config_parameter."""
        super(ResConfigSettings, self).set_values()
        # Storing the printer API value in ir.config_parameter table
        self.env['ir.config_parameter'].sudo().set_param('your_module.printer_API', self.printer_API)


    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        params += ['printer_API']

        return params    
    def get_pos_ui_settings(self):
        """ This method will send the value of showCategoriesBar to the POS frontend. """
        self.ensure_one()
        return {
            'showCategoriesBar': self.showCategoriesBar,
        }