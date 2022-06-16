import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

const AUTH_API = 'http://localhost:4000/api/';

const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' }),
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<any> {
    return this.http.post(
      AUTH_API + 'login',
      {
        username,
        password,
      },
      httpOptions
    );
  }

  register(
    username: string,
    email: string,
    address: string,
    hash: string
  ): Observable<any> {
    if (!username || !email || !address || !hash) return;
    return this.http.post(
      AUTH_API + 'register',
      {
        username,
        email,
        address,
        hash,
      },
      httpOptions
    );
  }
}
