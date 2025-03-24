from odoo import api, fields, models
from odoo.exceptions import UserError
from odoo.tools import _


class AccountJournalGroup(models.Model):
    _inherit = 'account.journal' 
    type = fields.Selection(
        selection_add=[
            ('check', 'Check'),
            ('BankTransfer', 'Bank transfer'),
            ('bit', 'Bit'),
        ],
        ondelete={
            'check': 'cascade',
            'BankTransfer': 'cascade',
            'bit': 'cascade',
        },
        help="""
        Select 'Sale' for customer invoices journals.
        Select 'Purchase' for vendor bills journals.
        Select 'Cash', 'Bank' or 'Credit Card' for journals that are used in customer or vendor payments.
        Select 'General' for miscellaneous operations journals.
        """
        
    )
    

