from odoo import fields, models

class MultiBarcodeProducts(models.Model):
    """
       Model for storing multiple barcode details
    """
    _name = 'multi.barcode.products'
    _description = 'For creating multiple Barcodes for products'

    multi_barcode = fields.Char(string="Barcode",
                                help="Provide alternate barcodes for this product", required=True) # The barcode should be required
    template_multi_id = fields.Many2one('product.template',
                                     string="Product Template", ondelete='cascade', index=True) # Added ondelete='cascade' and index=True

    _sql_constraints = [('field_unique', 'unique(multi_barcode)',
                         'Existing barcode is not allowed !')]