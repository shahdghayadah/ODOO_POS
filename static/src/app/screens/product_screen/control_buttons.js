import { _t } from "@web/core/l10n/translation";
import { ControlButtons } from '@point_of_sale/app/screens/product_screen/control_buttons/control_buttons';
import { patch } from "@web/core/utils/patch";
import { usePos } from "@point_of_sale/app/store/pos_hook";

patch(ControlButtons.prototype, {

    formatDateAndTime(date) {
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hours}:${minutes}`;
    },
    generateReportDRAWERContent() {
        let content = "";
    
        // Divider line
        content += "<div style='border-bottom: 1px dashed #000; display: block; margin: 5px 0; font-size:1px;'></div>\n";
    
        // Format and display Opening Date
        const openingDate = new Date(this.pos.session.start_at);
        const formattedOpeningDate = this.formatDateAndTime(openingDate);
        content += `<div style="display: flex; align-items: flex-start; margin-bottom: 0; direction: rtl; text-align: right;">
                    <div style="flex: 1;">תאריך פתיחה:</div>
                    <div style="flex: 1; word-wrap: break-word;">${formattedOpeningDate}</div>
                </div>\n`;
    
        // Cashier Information
        if (this.pos.cashier) {
            content += `<div style="display: flex; align-items: flex-start; margin-top: 10px; font-size: 0.9em; direction: rtl; text-align: right;">
                           <div style="flex: 1;">שם הקופאי:</div>
                           <div style="flex: 1; word-wrap: break-word;">${this.pos.cashier.name}</div>
                       </div>\n`;
        }
    
        // Note about manual opening of the drawer
        content += `<div style="display: flex; align-items: flex-start; margin-top: 10px; font-size: 0.9em; direction: rtl; text-align: right;">
                       <div style="flex: 1;">הערה:</div>
                       <div style="flex: 1; word-wrap: break-word;">המגירה נפתחה ידנית</div>
                   </div>\n`;
    
        return content;
    },
    printReportDRAWER(reportContent) {
        const printWindow = window.open('', '' ,'height=600,width=800');
        if (printWindow) {
            printWindow.document.write('<html><head><title>DRAWER</title>');
            printWindow.document.write('<style>');
            printWindow.document.write('@page { margin: 0; }'); // Removes default browser margins, including headers/footers
            printWindow.document.write('body {  font-size: 12px; }');
            printWindow.document.write('pre { white-space: pre-wrap; word-wrap: break-word; }'); // Ensure line wrapping
            printWindow.document.write('</style>');
            printWindow.document.write('</head><body>');
            printWindow.document.write(`<pre>${reportContent}</pre>`);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus(); // for IE browser
            printWindow.print();
            printWindow.close();
        } else {
            console.error('Failed to open print window. Please allow pop-ups.');
        }
    },

    downloadReportDRAWER() {
        const reportContent = this.generateReportDRAWERContent();
        this.printReportDRAWER(reportContent);
    },

});