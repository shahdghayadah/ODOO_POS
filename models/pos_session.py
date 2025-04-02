from datetime import date
from odoo import models, fields, api, _
from odoo.exceptions import AccessError
# import logging

# _logger = logging.getLogger(__name__)
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from odoo.tools.convert import datetime
from datetime import datetime
from odoo.fields import Datetime

class PosSession(models.Model):
    _inherit = 'pos.session'
    # def _get_closed_orders(self):
    #     #date_from = fields.Date.from_string('2025-01-01')
    #     #date_to = fields.Date.from_string('2025-01-30')
    #     date_from = datetime(2025, 2, 1, 0, 0)  # Start of the day on 1/2/2025
    #     date_to = datetime(2025, 3, 19, 23, 59, 59)  # End of the day on 19/3/2025

    #     return self.env['pos.order'].search([
    #         ('date_order', '>=', date_from.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
    #         ('date_order', '<=', date_to.strftime(DEFAULT_SERVER_DATETIME_FORMAT)),
    #         ('state', 'in', ['paid', 'invoiced', 'done', 'posted']),
    #     ])
    def get_closing_control_data(self):
        if not self.env.user.has_group('point_of_sale.group_pos_user'):
            raise AccessError(_("You don't have the access rights to get the point of sale closing control data."))
        self.ensure_one()
        orders = self._get_closed_orders()
        print('**************************',orders)
        payments = orders.payment_ids.filtered(lambda p: p.payment_method_id.type != "pay_later")
        cash_payment_method_ids = self.payment_method_ids.filtered(lambda pm: pm.type == 'cash')
        default_cash_payment_method_id = cash_payment_method_ids[0] if cash_payment_method_ids else None
        default_cash_payments = payments.filtered(lambda p: p.payment_method_id == default_cash_payment_method_id) if default_cash_payment_method_id else []
        total_default_cash_payment_amount = sum(default_cash_payments.mapped('amount')) if default_cash_payment_method_id else 0
        non_cash_payment_method_ids = self.payment_method_ids - default_cash_payment_method_id if default_cash_payment_method_id else self.payment_method_ids
        non_cash_payments_grouped_by_method_id = {pm: orders.payment_ids.filtered(lambda p: p.payment_method_id == pm) for pm in non_cash_payment_method_ids}

        cash_in_count = 0
        cash_out_count = 0
        cash_in_out_list = []
        for cash_move in self.sudo().statement_line_ids.sorted('create_date'):
            if cash_move.amount > 0:
                cash_in_count += 1
                name = f'Cash in {cash_in_count}'
            else:
                cash_out_count += 1
                name = f'Cash out {cash_out_count}'
            cash_in_out_list.append({
                'name': cash_move.payment_ref if cash_move.payment_ref else name,
                'amount': cash_move.amount
            })

        #Add order lines
        products_info = {
            'qty': 0,
            'total': 0
        }
        category_map = {}
        for order in orders:
            products_info['total'] += order.amount_total
            for line in order.lines:
                categoryName = line.product_id.product_tmpl_id.categ_id.name if line.product_id.product_tmpl_id.categ_id else "Uncategorized"

                if categoryName not in category_map:
                    category_map[categoryName] = {
                        'name': categoryName,
                        'qty': 0,
                        'total': 0,
                        'products':[],
                    }
                category_map[categoryName]['qty'] += line.qty
                category_map[categoryName]['total'] += line.price_subtotal_incl
                category_map[categoryName]['products'].append({
                        'product_id': line.product_id.display_name,
                        'qty': line.qty,
                        'uom_id': [line.product_uom_id.id, line.product_uom_id.name],
                        'price_subtotal_incl':line.price_subtotal_incl,
                        'discount':line.discount
                    })

        current_company = self.env.company  # Get the current company
        total_card_payment_amount = sum(
            sum(payments.mapped('amount')) for payments in non_cash_payments_grouped_by_method_id.values()
        ) if non_cash_payments_grouped_by_method_id else 0

        company_tax = current_company.account_sale_tax_id.amount if current_company.account_sale_tax_id else 0

        data = {
                    'orders_details': {
                        'orders': list(category_map.values()),
                        'products_info': products_info,
                        'company': company_tax,
                        'company_name': current_company.name,
                        'company_vat': current_company.vat,
                        'company_street': current_company.street,
                        'company_phone': current_company.phone,
                        'company_registry': current_company.company_registry,
                        'total_cash_payment': total_default_cash_payment_amount + total_card_payment_amount,
                        'quantity': len(orders),
                        'amount': sum(orders.mapped('amount_total')),
                    },
                    'opening_notes': self.opening_notes,
                    'default_cash_details': {
                        'name': default_cash_payment_method_id.name,
                        'amount': self.cash_register_balance_start
                                + total_default_cash_payment_amount
                                + sum(self.sudo().statement_line_ids.mapped('amount')),
                        'opening': self.cash_register_balance_start,
                        'payment_amount': total_default_cash_payment_amount,
                        'moves': cash_in_out_list,
                        'id': default_cash_payment_method_id.id
                    } if default_cash_payment_method_id else {},
                    'non_cash_payment_methods': [{
                        'name': pm.name,
                        'amount': sum(non_cash_payments_grouped_by_method_id[pm].mapped('amount')),
                        'number': len(non_cash_payments_grouped_by_method_id[pm]),
                        'id': pm.id,
                        'type': pm.type,
                    } for pm in non_cash_payment_method_ids],
                    'is_manager': self.env.user.has_group("point_of_sale.group_pos_manager"),
                    'amount_authorized_diff': self.config_id.amount_authorized_diff if self.config_id.set_maximum_difference else None,
                }
        print(data)
        return data
    


    def find_product_by_barcode(self, barcode, config_id):
        # _logger.info(f"Barcode scan initiated for: {barcode}")
        
        # # First check if this is a receipt number
        # receipt_number = f"Order {barcode}"
        # _logger.info(f"Checking for receipt with number: {receipt_number}")
        
        # order = self.env['pos.order'].search([
        #     ('pos_reference', '=', receipt_number),
        #     ('state', 'in', ['paid', 'invoiced', 'done', 'posted'])
        # ], limit=1)
        
        # if order:
        #     _logger.info(f"Found receipt order: ID={order.id}, Reference={order.pos_reference}")
        #     return {
        #         'product.product': [],  # Empty array required by frontend
        #         'product.packaging': [],  # Empty array required by frontend
        #         'pos_receipt': {  # Our receipt data
        #             'id': order.id,
        #             'pos_reference': order.pos_reference,
        #             'amount_total': order.amount_total,
        #             'date_order': order.date_order.strftime(DEFAULT_SERVER_DATETIME_FORMAT),
        #         }
        #     }
        
        # # Normal product scan fallthrough
        # _logger.info("No receipt found, proceeding with normal product scan")
            
        # # Normal product scan fallthrough
        # # ... (keep all your existing product scanning code)
        # # Rest of your existing barcode scanning logic
        product_fields = self.env['product.product']._load_pos_data_fields(config_id)
        product_packaging_fields = self.env['product.packaging']._load_pos_data_fields(config_id)
        product_context = {**self.env.context, 'display_default_code': False}

        # Standard barcode search on product.product
        product = self.env['product.product'].search([
            ('barcode', '=', barcode),
            ('sale_ok', '=', True),
            ('available_in_pos', '=', True),
        ])

        if product:
            product_data = product.with_context(product_context).read(product_fields, load=False)
            return {'product.product': product_data if product_data else []}

        # Search in multi.barcode.products
        multi_barcode_product = self.env['multi.barcode.products'].search([('multi_barcode', '=', barcode)], limit=1)
        if multi_barcode_product:
            product = self.env['product.product'].search([
                ('product_tmpl_id', '=', multi_barcode_product.template_multi_id.id),
                ('sale_ok', '=', True),
                ('available_in_pos', '=', True),
            ], limit=1)
            if product:
                product_data = product.with_context(product_context).read(product_fields, load=False)
                return {'product.product': product_data if product_data else []}

        # PLU barcode detection (13 digits, starts with '2')
        if len(barcode) == 13 and barcode[0] == '2':
            product_code = barcode[1:7]  # 6-digit product code
            weight_or_price = barcode[7:12]  # 5-digit weight/price
            product_code = str(int(product_code))  # "000090" → "90"

            product = self.env['product.product'].search([
                ('id', '=', product_code),
                ('sale_ok', '=', True),
                ('available_in_pos', '=', True),
            ])

            if product:
                product_data = product.with_context(product_context).read(product_fields, load=False)
                if product_data:
                    product_data = product_data[0]
                    is_weighed = product.product_tmpl_id.to_weight
                    if is_weighed:
                        product_data['plu_weight'] = int(weight_or_price) / 1000
                    else:
                        product_data['plu_weight'] = 1
                        product_data['lst_price'] = int(weight_or_price) / 100
                    return {'product.product': [product_data]}

        # Check for product packaging
        packaging = self.env['product.packaging'].search([('barcode', '=', barcode)])
        if packaging and packaging.product_id:
            product_data = packaging.product_id.with_context(product_context).read(product_fields, load=False)
            packaging_data = packaging.read(product_packaging_fields, load=False)
            return {
                'product.product': product_data,
                'product.packaging': packaging_data,
            }

        # Default return when no product or packaging is found
        return {
            'product.product': [],
            'product.packaging': [],
        }





    def closed_orders_between_dates(self,dataFrom , dateTo):
        date_from_dt = datetime.strptime(dataFrom, "%Y-%m-%dT%H:%M")
        date_to_dt = datetime.strptime(dateTo, "%Y-%m-%dT%H:%M")

        # Convert datetime objects to string in Odoo's datetime format
        date_from_str = Datetime.to_string(date_from_dt)
        date_to_str = Datetime.to_string(date_to_dt)


        return self.env['pos.order'].search([
            ('date_order', '>=', date_from_str),
            ('date_order', '<=', date_to_str),
            ('state', 'in', ['paid', 'invoiced', 'done', 'posted']),
        ])



    def get_closing_control_data_between_dates(self,dataFrom , dateTo):
        if not self.env.user.has_group('point_of_sale.group_pos_user'):
            raise AccessError(_("You don't have the access rights to get the point of sale closing control data."))
        self.ensure_one()
        orders = self.closed_orders_between_dates(dataFrom , dateTo)
        print('**************************',orders)
        payments = orders.payment_ids.filtered(lambda p: p.payment_method_id.type != "pay_later")
        cash_payment_method_ids = self.payment_method_ids.filtered(lambda pm: pm.type == 'cash')
        default_cash_payment_method_id = cash_payment_method_ids[0] if cash_payment_method_ids else None
        default_cash_payments = payments.filtered(lambda p: p.payment_method_id == default_cash_payment_method_id) if default_cash_payment_method_id else []
        total_default_cash_payment_amount = sum(default_cash_payments.mapped('amount')) if default_cash_payment_method_id else 0
        non_cash_payment_method_ids = self.payment_method_ids - default_cash_payment_method_id if default_cash_payment_method_id else self.payment_method_ids
        non_cash_payments_grouped_by_method_id = {pm: orders.payment_ids.filtered(lambda p: p.payment_method_id == pm) for pm in non_cash_payment_method_ids}

        cash_in_count = 0
        cash_out_count = 0
        cash_in_out_list = []
        for cash_move in self.sudo().statement_line_ids.sorted('create_date'):
            if cash_move.amount > 0:
                cash_in_count += 1
                name = f'Cash in {cash_in_count}'
            else:
                cash_out_count += 1
                name = f'Cash out {cash_out_count}'
            cash_in_out_list.append({
                'name': cash_move.payment_ref if cash_move.payment_ref else name,
                'amount': cash_move.amount
            })

        #Add order lines
        products_info = {
            'qty': 0,
            'total': 0
        }
        category_map = {}
        for order in orders:
            products_info['total'] += order.amount_total
            for line in order.lines:
                categoryName = line.product_id.product_tmpl_id.categ_id.name if line.product_id.product_tmpl_id.categ_id else "Uncategorized"

                if categoryName not in category_map:
                    category_map[categoryName] = {
                        'name': categoryName,
                        'qty': 0,
                        'total': 0,
                        'products':[],
                    }
                category_map[categoryName]['qty'] += line.qty
                category_map[categoryName]['total'] += line.price_subtotal_incl
                category_map[categoryName]['products'].append({
                        'product_id': line.product_id.display_name,
                        'qty': line.qty,
                        'uom_id': [line.product_uom_id.id, line.product_uom_id.name],
                        'price_subtotal_incl':line.price_subtotal_incl,
                        'discount':line.discount
                    })

        current_company = self.env.company  # Get the current company
        total_card_payment_amount = sum(
            sum(payments.mapped('amount')) for payments in non_cash_payments_grouped_by_method_id.values()
        ) if non_cash_payments_grouped_by_method_id else 0

        company_tax = current_company.account_sale_tax_id.amount if current_company.account_sale_tax_id else 0

        data = {
                    'orders_details': {
                        'orders': list(category_map.values()),
                        'products_info': products_info,
                        'company': company_tax,
                        'company_name': current_company.name,
                        'company_vat': current_company.vat,
                        'company_street': current_company.street,
                        'company_address': current_company.city,
                        'company_phone': current_company.phone,
                        'company_registry': current_company.company_registry,
                        'total_cash_payment': total_default_cash_payment_amount + total_card_payment_amount,
                        'quantity': len(orders),
                        'amount': sum(orders.mapped('amount_total')),
                    },
                    'opening_notes': self.opening_notes,
                    'default_cash_details': {
                        'name': default_cash_payment_method_id.name,
                        'amount': self.cash_register_balance_start
                                + total_default_cash_payment_amount
                                + sum(self.sudo().statement_line_ids.mapped('amount')),
                        'opening': self.cash_register_balance_start,
                        'payment_amount': total_default_cash_payment_amount,
                        'moves': cash_in_out_list,
                        'id': default_cash_payment_method_id.id
                    } if default_cash_payment_method_id else {},
                    'non_cash_payment_methods': [{
                        'name': pm.name,
                        'amount': sum(non_cash_payments_grouped_by_method_id[pm].mapped('amount')),
                        'number': len(non_cash_payments_grouped_by_method_id[pm]),
                        'id': pm.id,
                        'type': pm.type,
                    } for pm in non_cash_payment_method_ids],
                    'is_manager': self.env.user.has_group("point_of_sale.group_pos_manager"),
                    'amount_authorized_diff': self.config_id.amount_authorized_diff if self.config_id.set_maximum_difference else None,
                }
        print(data)
        return data
    