from odoo import api, fields, models


class PosPayment(models.Model):
    _inherit = "pos.payment"

    check_number = fields.Char(string='Number', default="N/A",required=False) #changed required to false
    check_transfer_amount = fields.Char(string='total Amount', default="N/A",required=False)
    check_transfer_date = fields.Char(string='payment  Date', default="N/A",required=False)
    check_customer_name = fields.Char(string='Customer Name', default="N/A",required=False) #corrected misspelling
    transfer_ref = fields.Char(string='Transfer Ref', default="N/A",required=False) #corrected string and add the ref
    phone_number = fields.Char(string='Phone Number', default="N/A",required=False)
    expDate = fields.Char(string='Exp Date', default="N/A",required=False)
    is_check_payment = fields.Boolean(
        string="Is Check Payment",
        compute='_compute_is_check_payment',
        store=True,
    )

    is_transfer = fields.Boolean(
        string="Is Transfer Payment",
        compute='_compute_is_transfer_payment',
        store=True,
    )

    is_bit = fields.Boolean(
        string="Is Bit Payment",
        compute='_compute_is_bit_payment',
        store=True,
    )
    is_card_nayax = fields.Boolean(
        string="Is Card Nayax",
        compute='_compute_is_card_nayax',
        store=True,
    )
    
    @api.depends('payment_method_id')
    def _compute_is_check_payment(self):
        for record in self:
            record.is_check_payment = record.payment_method_id.journal_type == 'check'

    @api.depends('payment_method_id')
    def _compute_is_transfer_payment(self):
        for record in self:
            record.is_transfer = record.payment_method_id.journal_type == 'BankTransfer'

    @api.depends('payment_method_id')
    def _compute_is_bit_payment(self):
        for record in self:
            record.is_bit = record.payment_method_id.journal_type == 'bit'


    @api.depends('payment_method_id.journal_id.type')
    def _compute_is_card_nayax(self):
        for record in self:
            record.is_card_nayax = record.payment_method_id.use_payment_terminal == 'nayax'

    # @api.model
    # def create(self, vals):
    #     # Set check_number to 'N/A' if journal isn't of type 'check'
    #     if 'payment_method_id' in vals:
    #         payment_method = self.env['pos.payment.method'].browse(vals['payment_method_id'])
    #         if payment_method.journal_id.type != 'check' and not vals.get('check_number'):
    #             vals['check_number'] = 'N/A'

    #     return super().create(vals)

    # def write(self, vals):
    #     # Set check_number to 'N/A' if journal isn't of type 'check'
    #     if 'payment_method_id' in vals:
    #         payment_method = self.payment_method_id
    #         if payment_method.journal_id.type != 'check' and not vals.get('check_number'):
    #             vals['check_number'] = 'N/A'

        # return super().write(vals)