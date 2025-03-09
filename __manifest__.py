# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

{
    'name': 'KAD Point of Sale',
    'version': '1.0.1',
    'category': 'Sales/Point of Sale',
    'sequence': 40,
    "author": "KAD",
    'summary': 'report x and z & online payment by nayax',
    'depends': ['base', 'point_of_sale' ,'account' ,'web','sale_management' ,'bus'],
    'data': [
        'views/res_config_settings_view.xml',
        'views/pos_payment_method_views.xml',
         'views/pos_payment_views.xml',
         'views/pos_printer.xml',
        'security/ir.model.access.csv',  # Add the security file


    ],

'installable': True,
'assets': {

    'point_of_sale._assets_pos': [

                "point_of_sale_1/static/src/app/navbar/closing_popup/closing_popup.xml",
                "point_of_sale_1/static/src/app/navbar/closing_popup/closing_popup.js",
                "point_of_sale_1/static/src/app/screens/payment_screen/payment_screen.js",
                "point_of_sale_1/static/src/app/screens/payment_screen/payment_screen.xml",
                "point_of_sale_1/static/src/app/screens/payment_screen/payment_lines/payment_lines.js",
                "point_of_sale_1/static/src/app/screens/payment_screen/payment_functions.js",
                "point_of_sale_1/static/src/app/store/pos_store.js",
                'point_of_sale_1/static/src/app/navbar/popup/**/**',

                'point_of_sale_1/static/src/models/pos_order.js', 

                "point_of_sale_1/static/src/app/screens/product_screen/control_buttons.xml",
                "point_of_sale_1/static/src/app/screens/product_screen/control_buttons.js",


                "point_of_sale_1/static/src/app/screens/ticket_screens/ticket_screen.xml",



                # 'point_of_sale_1/static/src/app/screens/receipt_screen/receipt_header.xml',
                # 'point_of_sale_1/static/src/app/screens/receipt_screen/order_receipt.xml',
            "point_of_sale_1/static/src/scss/overwritecss.scss",
            "point_of_sale_1/static/src/app/navbar/navbar.xml",
            "point_of_sale_1/static/src/app/screens/saver_screen/saver_screen.xml"
                ],

                        'web.assets_backend': [
            "point_of_sale_1/static/src/scss/overwritecss.scss",
        ], 
    
    'images': [
        'static/description/banner-1.png',
        'static/description/banner-2.png',
    ],
},
    'license': 'LGPL-3',
}
