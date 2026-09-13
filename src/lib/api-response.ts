import { NextResponse } from 'next/server';

export interface ApiResponseSuccess<T = any> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiResponseError {
  success: false;
  data: null;
  message: string;
}

export type ApiResponse<T = any> = ApiResponseSuccess<T> | ApiResponseError;

/**
 * Returns a standardized success JSON response
 */
export function successResponse<T>(data: T, message?: string, status = 200) {
  const body: ApiResponseSuccess<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  return NextResponse.json(body, { status });
}

/**
 * Returns a standardized error JSON response
 */
export function errorResponse(message: string, status = 400) {
  const body: ApiResponseError = {
    success: false,
    data: null,
    message,
  };
  return NextResponse.json(body, { status });
}
