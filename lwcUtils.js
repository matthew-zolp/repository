/**
 * Reduces one or more LDS errors into a string[] of error messages.
 * @param {FetchResponse|FetchResponse[]} errors
 * @return {String[]} Error messages
 */
export function reduceErrors(errors) {
    if (!Array.isArray(errors)) {
        errors = [errors];
    }

    return (
        errors
            // Remove null/undefined items
            .filter((error) => !!error)
            // Extract an error message
            .map((error) => {
                // UI API read errors
                if (Array.isArray(error.body)) {
                    console.log('1 isRunning');
                    return error.body.map((e) => e.message);
                }
                // UI API DML, Apex and network errors
                else if (error.body && typeof error.body.message === 'string') {
                    console.log('2 :' + error.body.message);
                    return error.body.message;
                }
                // JS errors
                else if (typeof error.message === 'string') {
                    console.log('3 :' + error.message);

                    return error.message;
                }
                // Unknown error shape so try HTTP status text
                console.log('4 :' + error.statusText);
                console.log(JSON.stringify(error));
                console.log(typeof error.body.message);
                return error.statusText;
            })
            // Flatten
            .reduce((prev, curr) => prev.concat(curr), [])
            // Remove empty strings
            .filter((message) => !!message)
    );
}