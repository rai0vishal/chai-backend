class apiError extends Error{
    constructor(
        statusCode,
        message="Something Went Wrong",
        error =[],
        stack=""
    ){
        super(message)
        this.statusCode=statusCode
        this.Data = null
        this.message = false,
        this.success = false,
        this.error = error

        if (stack) {
            this.stack = stack
        } else {
            Error.captureStackTrace(this, this.constructor)
        }

    }

}

expoer(apiError)