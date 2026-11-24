import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { StudyMaterials } from "@/components/study-materials";
import { meQuery } from "@/lib/auth";
import { pageHead } from "@/lib/page-head";
export const Route = createFileRoute("/_authenticated/teacher/materials")({ staticData: { sitemap: false }, head: () => pageHead("Study materials", "Upload notes and study files for your ExamHubb students."), component: Page });
function Page() { const { data: me } = useSuspenseQuery(meQuery); return <StudyMaterials teacherId={me!.userId} />; }
