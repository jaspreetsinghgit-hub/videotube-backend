import { ApiResponse } from "../utilities/ApiResponse.js";
import { asyncHandler } from "../utilities/requestHandler.js";

const healthcheck = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, null, "Okay")
    )
});

export { healthcheck };