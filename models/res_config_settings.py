from odoo import fields, models

class ResConfigSettings(models.TransientModel):
    _inherit = 'res.config.settings'

    # kad_shahd
    module_pos_nayax = fields.Boolean(
        string="Nayax",
        help="Enable this feature to activate the custom PoS functionality."
    )

    module_pos_Checks= fields.Boolean(
        string="Checks",
        help="Enable this feature to activate the custom PoS functionality Checks."
    )
