<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\AuthenticatesUsers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class LoginController extends Controller
{

    /**
     * LoginController constructor.
     */
    public function __construct()
    {
        $this->middleware('guest')->except('logout');
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function login(Request $request){
        $username = $request->get('username');
        $password = $request->get('password');
        $rememberMe = (bool) $request->get('remember_me', false);

        $response = ['status' => 'error', 'message' => 'Wrong username and/or password'];

        if(Auth::attempt(['username' => $username, 'password' => $password], $rememberMe)){
            $response = ['status' => 'success'];
        }

        return response()->json($response);
    }

    /**
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout(Request $request){
        Auth::logout();

        $request->session()->invalidate();

        return response()->json(['status' => 'success']);
    }
}
