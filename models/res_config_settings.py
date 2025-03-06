from build import _logger
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