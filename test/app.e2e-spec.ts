import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../src/app.module";
import { PrismaService } from "../src/prisma/prisma.service";
import * as pactum from "pactum";
import { AuthDto } from "../src/auth/dto";
import { CreateBookmarkDto, EditBookmarkDto } from "../src/bookmark/dto";

const PORT = 4000;

describe("App e2e", () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

    await app.init();
    await app.listen(PORT);

    prisma = app.get(PrismaService);

    await prisma.cleanDb();

    pactum.request.setBaseUrl(`http://localhost:${PORT}`);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("Auth", () => {
    const dto: AuthDto = { email: "test@e2e.com", password: "test1234" };

    describe("Register", () => {
      it("should throw an exception when no body was provided", () => {
        return pactum.spec().post("/auth/register").expectStatus(400);
      });

      it("should throw an exception when the email is invalid", () => {
        return pactum
          .spec()
          .post("/auth/register")
          .withBody({ ...dto, email: "test_test.de" })
          .expectStatus(400);
      });

      it("should throw an exception when the password contains less than eight letters", () => {
        return pactum
          .spec()
          .post("/auth/register")
          .withBody({ ...dto, password: "1234567" })
          .expectStatus(400);
      });

      it("should register a user when the inputs are valid", () => {
        return pactum
          .spec()
          .post("/auth/register")
          .withBody(dto)
          .expectStatus(201);
      });
    });

    describe("Login", () => {
      it("should throw an exception when no body was provided", () => {
        return pactum.spec().post("/auth/login").expectStatus(400);
      });

      it("should throw an exception when the email is invalid", () => {
        return pactum
          .spec()
          .post("/auth/login")
          .withBody({ ...dto, email: "test_test.de" })
          .expectStatus(400);
      });

      it("should throw an exception when the password contains less than eight letters", () => {
        return pactum
          .spec()
          .post("/auth/login")
          .withBody({ ...dto, password: "1234567" })
          .expectStatus(400);
      });

      it("should login a user when credentials are valid", () => {
        return pactum
          .spec()
          .post("/auth/login")
          .withBody(dto)
          .expectStatus(200)
          .stores("userAccessToken", "access_token");
      });
    });
  });

  describe("User", () => {
    describe("Get current user", () => {
      it("should throw an exception when no access-token was provided", () => {
        return pactum.spec().get("/users/me").expectStatus(401);
      });

      it("should throw an exception when the access-token is invalid", () => {
        return pactum
          .spec()
          .get("/users/me")
          .withHeaders({ Authorization: "Bearer __invalid__" })
          .expectStatus(401);
      });

      it("should return the user when the user is logged in", () => {
        return pactum
          .spec()
          .get("/users/me")
          .withHeaders({ Authorization: "Bearer $S{userAccessToken}" })
          .expectStatus(200);
      });
    });

    describe("Edit current user", () => {
      it("should edit user", () => {
        const editUserDto = { firstName: "Finn" };

        return pactum
          .spec()
          .patch("/users/me")
          .withHeaders({ Authorization: "Bearer $S{userAccessToken}" })
          .withBody(editUserDto)
          .expectStatus(200)
          .expectBodyContains(editUserDto.firstName);
      });
    });

    describe("Delete User", () => {});
  });

  describe("Bookmarks", () => {
    describe("Get empty bookmarks", () => {
      it("should get bookmarks", () => {
        return pactum
          .spec()
          .get("/bookmarks")
          .withHeaders({
            Authorization: "Bearer $S{userAccessToken}",
          })
          .expectStatus(200)
          .expectBody([]);
      });
    });

    describe("Create bookmark", () => {
      const dto: CreateBookmarkDto = {
        title: "First Bookmark",
        link: "https://www.youtube.com/watch?v=d6WC5n9G_sM",
      };
      it("should create bookmark", () => {
        return pactum
          .spec()
          .post("/bookmarks")
          .withHeaders({
            Authorization: "Bearer $S{userAccessToken}",
          })
          .withBody(dto)
          .expectStatus(201)
          .stores("bookmarkId", "id");
      });
    });

    describe("Get bookmarks", () => {
      it("should get bookmarks", () => {
        return pactum
          .spec()
          .get("/bookmarks")
          .withHeaders({
            Authorization: "Bearer $S{userAccessToken}",
          })
          .expectStatus(200)
          .expectJsonLength(1);
      });
    });

    describe("Get bookmark by id", () => {
      it("should get bookmark by id", () => {
        return pactum
          .spec()
          .get("/bookmarks/{id}")
          .withPathParams("id", "$S{bookmarkId}")
          .withHeaders({
            Authorization: "Bearer $S{userAccessToken}",
          })
          .expectStatus(200)
          .expectBodyContains("$S{bookmarkId}");
      });
    });

    describe("Edit bookmark by id", () => {
      const dto: EditBookmarkDto = {
        title:
          "Kubernetes Course - Full Beginners Tutorial (Containerize Your Apps!)",
        description:
          "Learn how to use Kubernetes in this complete course. Kubernetes makes it possible to containerize applications and simplifies app deployment to production.",
      };
      it("should edit bookmark", () => {
        return pactum
          .spec()
          .patch("/bookmarks/{id}")
          .withPathParams("id", "$S{bookmarkId}")
          .withHeaders({
            Authorization: "Bearer $S{userAccessToken}",
          })
          .withBody(dto)
          .expectStatus(200)
          .expectBodyContains(dto.title)
          .expectBodyContains(dto.description);
      });
    });

    describe("Delete bookmark by id", () => {
      it("should delete bookmark", () => {
        return pactum
          .spec()
          .delete("/bookmarks/{id}")
          .withPathParams("id", "$S{bookmarkId}")
          .withHeaders({
            Authorization: "Bearer $S{userAccessToken}",
          })
          .expectStatus(204);
      });

      it("should get empty bookmarks", () => {
        return pactum
          .spec()
          .get("/bookmarks")
          .withHeaders({
            Authorization: "Bearer $S{userAccessToken}",
          })
          .expectStatus(200)
          .expectJsonLength(0);
      });
    });
  });
});
