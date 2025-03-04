from odoo import api, fields, models
from odoo.exceptions import UserError
from odoo.tools import _


class AccountJournalGroup(models.Model):
    _inherit = 'account.journal' 
    type = fields.Selection([
            ('sale', 'Sales'),
            ('purchase', 'Purchase'),
            ('cash', 'Cash'),
            ('bank', 'Bank'),
            ('credit', 'Credit Card'),
            ('general', 'Miscellaneous'),
            ('check', 'Check'),
            ('BankTransfer', 'Bank transfer'),
            ('bit', 'Bit'),
            

        ], required=True,
        help="""
        Select 'Sale' for customer invoices journals.
        Select 'Purchase' for vendor bills journals.
        Select 'Cash', 'Bank' or 'Credit Card' for journals that are used in customer or vendor payments.
        Select 'General' for miscellaneous operations journals.
        """)
    

class PosPaymentMethod(models.Model):
    _inherit = "pos.payment.method"
    journal_id = fields.Many2one(
        'account.journal',
        string='Journal',
        domain=[
            '|',
            '&',
            ('type', 'in', ['cash', 'check','BankTransfer' ,'bit']), 
            ('pos_payment_method_ids', '=', False), 
            ('type', 'in', ['bank', 'check','BankTransfer' ,'bit']),
        ],
        ondelete='restrict',
        help=(
            "Leave empty to use the receivable account of the customer.\n"
            "Defines the journal where to book the accumulated payments (or individual payment if Identify Customer is true) "
            "after closing the session.\n"
            "For cash journal, we directly write to the default account in the journal via statement lines.\n"
            "For bank journal, we write to the outstanding account specified in this payment method.\n"
            "Only cash, bank, and check journals are allowed."
        )
    )
    @api.onchange('journal_id')
    def _onchange_journal_id(self):
        for pm in self:
            if pm.journal_id and pm.journal_id.type not in ['cash', 'bank','check','BankTransfer' ,'bit']:
                raise UserError(_("Only journals of type 'Cash' ,'Checke' or 'Bank' could be used with payment methods."))
        if self.is_cash_count:
            self.use_payment_terminal = False