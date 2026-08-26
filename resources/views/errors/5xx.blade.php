@extends('errors.layout')
@section('code', $exception->getStatusCode())
@section('title', 'Layanan mengalami kendala')
@section('message', 'Sistem belum dapat menyelesaikan permintaan ini. Silakan kembali ke dashboard dan coba lagi beberapa saat.')
