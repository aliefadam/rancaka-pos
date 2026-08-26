@extends('errors.layout')
@section('code', $exception->getStatusCode())
@section('title', 'Permintaan tidak dapat dilanjutkan')
@section('message', 'Halaman atau tindakan yang diminta tidak tersedia. Kembali ke dashboard untuk melanjutkan pekerjaan Anda.')
