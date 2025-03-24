from odoo import api, fields, models

class ProductTemplate(models.Model):
    _inherit = 'product.template'

    template_multi_barcodes_ids = fields.One2many(
        'multi.barcode.products', 'template_multi_id',
        string='Additional Barcodes', help="Additional barcodes for the product")
