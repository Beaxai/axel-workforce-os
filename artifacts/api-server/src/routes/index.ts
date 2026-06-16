import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import usersRouter from "./users";
import dealsRouter from "./deals";
import quotesRouter from "./quotes";
import policiesRouter from "./policies";
import commissionsRouter from "./commissions";
import contactsRouter from "./contacts";
import employeesRouter from "./employees";
import tasksRouter from "./tasks";
import notesRouter from "./notes";
import agentRegistrationsRouter from "./agent-registrations";
import rateTablesRouter from "./rate-tables";
import implementationRouter from "./implementation";
import workforceRouter from "./workforce";
import accountsRouter from "./accounts";
import partnersRouter from "./partners";
import resourcesRouter from "./resources";
import searchRouter from "./search";
import wcRatesRouter from "./wc-rates";
import rateRouter from "./rate";
import submissionRouter from "./submission";
import lossHistoryRouter from "./loss-history";
import proposalsRouter from "./proposals";
import signaturesRouter from "./signatures";
import documentsRouter from "./documents";
import appetiteRouter from "./appetite";
import aiRouter from "./ai";
import { requireAuth, requireRoles } from "../middleware/require-auth";

const router: IRouter = Router();

/* ---------------------------------------------------------------------------
 * PUBLIC routes (no authentication required)
 * ------------------------------------------------------------------------- */
router.use(healthRouter); // GET /healthz
router.use("/auth", authRouter); // login/logout/forgot/reset public; /me + /register guard internally

// Public agent self-registration: only POST /api/agent-registrations is open.
// GET/PATCH fall through to the role-gated mount below.
router.post("/agent-registrations", (req, res, next) => {
  req.url = "/";
  agentRegistrationsRouter(req, res, next);
});

/* ---------------------------------------------------------------------------
 * AUTH GATE — everything below requires a valid session.
 * ------------------------------------------------------------------------- */
router.use(requireAuth);

/* ---------------------------------------------------------------------------
 * Role-gated routes. Each router declares the roles permitted to reach it.
 * ------------------------------------------------------------------------- */
const INTERNAL_SALES = ["ADMIN", "CSA", "AGENT", "UNDERWRITER"] as const;

router.use("/organizations", requireRoles("ADMIN", "CSA"), organizationsRouter);
// GET listing is team-directory reference data (assignee chips) for internal
// staff; create/update/delete are ADMIN-only, guarded inside the router.
router.use("/users", requireRoles(...INTERNAL_SALES), usersRouter);
router.use("/deals", requireRoles(...INTERNAL_SALES), dealsRouter);
router.use("/quotes", requireRoles(...INTERNAL_SALES), quotesRouter);
router.use("/policies", requireRoles("ADMIN", "CSA", "UNDERWRITER"), policiesRouter);
router.use("/commissions", requireRoles("ADMIN", "CSA", "AGENT"), commissionsRouter);
router.use("/contacts", requireRoles(...INTERNAL_SALES), contactsRouter);
router.use("/employees", requireRoles("ADMIN", "CSA", "AGENT", "EMPLOYER"), employeesRouter);
router.use("/tasks", requireRoles("ADMIN", "CSA"), tasksRouter);
router.use("/notes", requireRoles(...INTERNAL_SALES), notesRouter);
router.use("/agent-registrations", requireRoles("ADMIN", "CSA"), agentRegistrationsRouter);
router.use("/rate-tables", requireRoles("ADMIN"), rateTablesRouter);
router.use("/implementation", requireRoles("ADMIN", "CSA"), implementationRouter);
router.use("/workforce", requireRoles("ADMIN", "CSA", "AGENT"), workforceRouter);
router.use("/accounts", requireRoles(...INTERNAL_SALES), accountsRouter);
router.use("/partners", requireRoles("ADMIN", "CSA", "PEO"), partnersRouter);
router.use("/resources", requireRoles(), resourcesRouter); // any authenticated user
router.use("/search", requireRoles(...INTERNAL_SALES), searchRouter);
router.use("/wc-rates", requireRoles(...INTERNAL_SALES), wcRatesRouter);
router.use("/rate", requireRoles(...INTERNAL_SALES), rateRouter);
router.use("/submission", requireRoles(...INTERNAL_SALES), submissionRouter);
router.use("/loss-history", requireRoles(...INTERNAL_SALES), lossHistoryRouter);
router.use("/proposals", requireRoles(...INTERNAL_SALES), proposalsRouter);
router.use("/signatures", requireRoles("ADMIN", "CSA", "UNDERWRITER"), signaturesRouter);
router.use("/documents", requireRoles(...INTERNAL_SALES), documentsRouter);
router.use("/appetite", requireRoles("ADMIN", "CSA", "UNDERWRITER"), appetiteRouter);
router.use("/ai", requireRoles(...INTERNAL_SALES), aiRouter);
router.use("/bind-packages", requireRoles(...INTERNAL_SALES), (req, res, next) => {
  req.url = "/bind-package" + req.url;
  documentsRouter(req, res, next);
});

export default router;
