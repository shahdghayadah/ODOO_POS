
# kad_shahd
import logging
import re
import requests
import werkzeug

from odoo import fields, models, api, _
from odoo.exceptions import ValidationError, UserError, AccessError

_logger = logging.getLogger(__name__)
TIMEOUT = 10

class PosPaymentMethod(models.Model):

    _inherit = 'pos.payment.method'
    api_key = fields.Char(string="Payment Device IP ", copy=False)
    public_api_key = fields.Char(string="Public IP", copy=False)
    is_regular_payment = fields.Boolean(string="Regular Payment", default=True)
    type = fields.Selection(selection=[('cash', 'Cash'), ('bank', 'Bank'), ('pay_later', 'Customer Account') , ('check', 'Check') ,('BankTransfer','Bank transfer' )  ,('bit' ,'Bit')], compute="_compute_type")

    def _get_payment_terminal_selection(self):
        return super()._get_payment_terminal_selection() + [('nayax', 'Nayax')]
    
    @api.model
    def _load_pos_data_fields(self, config_id):
        params = super()._load_pos_data_fields(config_id)
        params += ['api_key']
        params += ['public_api_key']
        params += ['is_regular_payment']

        return params
    


    def save_api_key(self):
        for record in self:
            if not record.api_key:
                raise UserError(_("API key cannot be empty!"))
            _logger.info("API key saved for payment method: %s", record.name)
            # Here, you can add any logic needed to use the api_key for other purposes
            # For example, updating a related model or making an API call
            record.write({'api_key': record.api_key , 'public_api_key': record.public_api_key , 'is_regular_payment': record.is_regular_payment})
            return True
        

    @api.depends('journal_id', 'split_transactions')
    def _compute_type(self):
        for pm in self:
            try:
                if pm.journal_id and pm.journal_id.type in {'cash', 'bank', 'check','BankTransfer' ,'bit'}:
                    pm.type = pm.journal_id.type
                else:
                    pm.type = 'pay_later'
            except Exception as e:
                _logger.error("Error computing type for %s: %s", pm.name, str(e))
                pm.type = 'pay_later'  # Fallback to a default value
