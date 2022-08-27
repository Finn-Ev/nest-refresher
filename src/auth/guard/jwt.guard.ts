import { AuthGuard } from "@nestjs/passport";

// jwt is default
export class JwtGuard extends AuthGuard("jwt") {
  constructor() {
    super();
  }
}
