// import { BehaviorSubject } from "rxjs";

// class AuthService {
  
//   user$ = new BehaviorSubject(null);

 
//   setUser(data) {
//     this.user$.next(data);
//   }

 
//   getUser() {
//     return this.user$.getValue();
//   }

  
//   clearUser() {
//     this.user$.next(null);
//   }
// }

// export const authService = new AuthService();

import { BehaviorSubject } from "rxjs";

class AuthService {
  // Load user from localStorage if available
  user$ = new BehaviorSubject(JSON.parse(localStorage.getItem("user")) || null);

  // Set user data and persist it
  setUser(data) {
    this.user$.next(data);
    localStorage.setItem("user", JSON.stringify(data));
  }

  // Get the latest user data
  getUser() {
    return this.user$.getValue();
  }

  // Clear user on logout
  clearUser() {
    this.user$.next(null);
    localStorage.removeItem("user");
  }
}

export const authService = new AuthService();

