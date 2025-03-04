import json
import os
from odoo import http
from odoo.addons import bus
from odoo.http import request, Response
response_data = None
class MyApiController(http.Controller):

    # Define a route for GET requests
    @http.route('/api/get_data', type='json', auth='public', methods=['POST'])
    def get_data(self):
        # Get the module path for 'point_of_sale_1'
        from odoo.modules.module import get_module_path
        module_path = get_module_path('point_of_sale_1')
        file_path = os.path.join(module_path, 'controllers', 'test.json')
        
        try:
            # Read the content of the JSON file
            with open(file_path, 'r') as json_file:
                data = json.load(json_file)
            
            # Return the JSON data as the response
            return {'data': data, 'status': 'success'}
        except FileNotFoundError:
            return {'error': 'File not found', 'status': 'failure'}
        except json.JSONDecodeError:
            return {'error': 'Invalid JSON format', 'status': 'failure'}


    @http.route('/save-transaction', type='json', auth='public', methods=['POST'], csrf=False)
    def save_transaction(self, **post):
  
        # Define the file path where the JSON file will be saved
        file_name = f"test.json"
        file_path = os.path.join(os.path.dirname(__file__), file_name)

        # Write the JSON data to the file
        with open(file_path, 'w') as json_file:
            json.dump(post, json_file, indent=4)

        print(f"JSON file saved at: {file_path}")


    @http.route('/api/get_response', type='json', auth='public', methods=['POST'], csrf=False)
    def get_response(self, **kwargs):
        global response_data
        try:
            response_data = kwargs

            # Write the response to a file
            file_name = "test.json"
            file_path = os.path.join(os.path.dirname(__file__), file_name)  # Save in a temporary directory
            with open(file_path, "w", encoding="utf-8") as json_file:
                json.dump('', json_file, ensure_ascii=False, indent=4)

            # Return the response data
            return response_data

        except Exception as e:
            # Handle exceptions gracefully
            return {
                "jsonrpc": "2.0",
                "id": kwargs.get('id', 'error_id'),
                "error": {
                    "code": 500,
                    "message": str(e),
                    "data": {}
                }
            }




    @http.route('/api/get_latest_response', type='json', auth='public', methods=['POST'], csrf=False)
    def get_latest_response(self, **kwargs):
        global response_data
        return response_data or {}


    @http.route('/api/clear_response_data', type='json', auth='public', methods=['POST'], csrf=False)
    def clear_response_data(self, **kwargs):
        global response_data
        response_data = {}
        return response_data

