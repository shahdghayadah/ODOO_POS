
// kad_shahd
export async function sendTransactionRequest(amount, vuid, api_key, tranType, public_api_key) {
    const payload = {
        "jsonrpc": "2.0",
        "method": "doTransaction",
        "id": "0883012",
        "params": [
            "ashrait", {
                "vuid": `${vuid}`,
                "tranType": tranType,
                "tranCode": 1,
                "creditTerms": 1,
                "amount": amount,
                "currency": "376",
                "additionalInfo": {
                    "storeId": "string",
                    "posId": "string"
                }
            }
        ]
    }

    console.log("Payload:", payload);
    // Send the request
    // const url = `${public_api_key}`;
    const url = 'http://192.168.1.13:8080/SPICy'
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "id": api_key,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log("Response:", result);
        return result; // Return the response for further processing if needed
    } catch (error) {
        console.error("Error during the transaction:", error);
    }
}

// kad_shahd
export async function sendTransactionPhase1(amount, vuid, api_key, tranType, public_api_key , payments , creditTerms) {
    const payload = {
        "jsonrpc":"2.0",
        "method":"doTransactionPhase1",
        "id":"67575",
        "params": [
            "ashrait",{
                "vuid": vuid,
                "tranType": tranType,
                "tranCode": 1,
                "creditTerms": creditTerms,
                "amount": amount,
                "currency": "376",
                "payments":payments,


                }
            ]
    }
    
    console.log("Payload:", payload);
    // Send the request
    const url = `${public_api_key}`;
    // const url ='http://192.168.1.13:8080/SPICy'


    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "id": api_key,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log("Response:", result);
        return result; // Return the response for further processing if needed
    } catch (error) {
        console.error("Error during the transaction:", error);
    }
}


// kad_shahd
export async function sendTransactionPhase2(vuid, api_key, public_api_key , payments , creditTerms ) {
    const payload = {
        "jsonrpc": "2.0",
        "method": "doTransactionPhase2",
        "params": [
            "ashrait",
            {
                "tranCode": 1,
                "creditTerms": creditTerms,
                "payments":payments,

            }
        ],
        "id": "952550747"
    }
    
    console.log("Payload:", payload);
    // Send the request
    const url = `${public_api_key}`;
    // const url ='http://192.168.1.13:8080/SPICy'

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "id": api_key,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log("Response:", result);
        return result; // Return the response for further processing if needed
    } catch (error) {
        console.error("Error during the transaction:", error);
    }
}


export async function doTransactionCNP(vuid, api_key, public_api_key , amount , cardNumber ,expDate , cvv , cardHolderId) {
    const payload = {
        "jsonrpc": "2.0",
        "method": "doTransaction",
        "id": "123454352",
        "params": [
            "ashrait",
            {
                "vuid": vuid,
                "tranType": 1,
                "tranCode": 1,
                "amount": amount,
                "currency": "376",
                "creditTerms": 1,
                "posEntryMode": 50,
                "cardNumber": cardNumber,
                "expDate": expDate,
                "cvv": cvv,
                "cardHolderId": cardHolderId
            }
        ]
    }
    
    
    console.log("Payload:", payload);
    // Send the request
    const url = `${public_api_key}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "id": api_key,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log("Response:", result);
        return result; // Return the response for further processing if needed
    } catch (error) {
        console.error("Error during the transaction:", error);
    }
}


// kad_shahd
export async function sendDoPeriodic(public_api_key,api_key) {
    const payload ={
        "jsonrpc": "2.0",
        "method": "doPeriodic",
        "params": [
            "ashrait", "wide",
            {
                "forceUpdateParams": true
            }
        ],
        "id": 2
    }
    
    console.log("Payload:", payload);
    // Send the request
    const url = `${public_api_key}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "id": api_key,
            },
            body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log("Response:", result);
        return result; // Return the response for further processing if needed
    } catch (error) {
        console.error("Error during the transaction:", error);
    }
}




