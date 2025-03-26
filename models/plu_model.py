from odoo import models, fields, api
import base64  # Add this import statement
import serial
class PLUModel(models.TransientModel):
    _name = 'plu.model'
    _description = 'PLU Management'

    category_ids = fields.Many2many(
        'product.category', 
        string="Product Categories", 
        required=True
    )


    def action_download(self):
        # Fetch products belonging to the selected categories
        products = self.env['product.product'].search([
            ('categ_id', 'in', self.category_ids.ids)
        ])

        # Prepare the content for the .txt file
        file_content = ""
        for product in products:
            # Field 1: Product Code (13 characters, starting at position 0)
            product_code = str(product.id).zfill(13)

            # Field 2: Product Name (20 characters, starting at position 14)
            product_name = product.name.ljust(20)[:20]  # Ensure it's exactly 20 characters

            # Field 3: Weighed / Not Weighed Indicator (1 character, position 35)
            weighed_indicator = "0" if product.product_tmpl_id.weight == 0.00 else "1"

            # Field 4: Price (6 characters, starting at position 37)
            price = f"{int(product.lst_price * 100):06}"  # Convert price to cents and ensure 6 characters

            # Combine all fields into a single line
            line = f"{product_code} {product_name} {weighed_indicator} {price}\n"
            file_content += line

        # Encode the file content to base64
        file_content_base64 = base64.b64encode(file_content.encode('ANSI'))

        # Create an attachment for the file
        attachment = self.env['ir.attachment'].create({
            'name': 'PLU.TXT',
            'datas': file_content_base64,
            'res_model': 'plu.categories.selection',
            'res_id': self.id,
            'type': 'binary',
        })

        # Return a download action for the file
        return {
            'type': 'ir.actions.act_url',
            'url': f'/web/content/{attachment.id}?download=true',
            'target': 'self',
        }
    def action_read(self):
        SERIAL_PORT = "COM3"  # Replace with your actual COM port (e.g., /dev/ttyUSB0 on Linux)
        BAUD_RATE = 9600  # Adjust based on your scale’s settings

        try:
            with serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1) as ser:
                ser.write(b"\r")  # Send a command if required by the scale
                weight_data = ser.readline().decode('utf-8').strip()
                print(f"Weight data read from scale: {weight_data}")
                return weight_data
        except Exception as e:
            print(f"Error reading from scale: {str(e)}")
            return f"Error: {str(e)}"
