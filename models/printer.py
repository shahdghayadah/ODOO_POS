from odoo import api, fields, models



class PosPrinter(models.Model):
    _name = "printer.kad"
    _description = "POS Printer Configuration"

    name = fields.Char(string="Printer Name", required=True, help="Name of the printer (e.g., Kitchen Printer)")
    pos_category_id = fields.Many2one('pos.category', string="POS Category", help="Category of POS orders this printer serves (e.g., Food, Drinks)")


