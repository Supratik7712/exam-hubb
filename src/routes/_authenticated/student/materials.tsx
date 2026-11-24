import { createFileRoute } from "@tanstack/react-router";
import { StudyMaterials } from "@/components/study-materials";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/student/materials")({ staticData: { sitemap: false }, head: () => pageHead("Study materials", "Notes and study files from your ExamHubb teachers."), component: () => <StudyMaterials /> });
