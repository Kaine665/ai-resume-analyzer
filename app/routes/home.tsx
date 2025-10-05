import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import { usePuterStore } from "~/lib/puter";
import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job!" },
  ];
}

export default function Home() {
  const { auth, kv } = usePuterStore();
  const navigate = useNavigate();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) navigate("/auth?next=/");
  }, [auth.isAuthenticated]);

  useEffect(() => {
    const loadResumes = async () => {
      setLoadingResumes(true);

      try {
        const resumes = (await kv.list("resume:*", true)) as KVItem[];

        const parsedResumes = resumes?.map(
          (resume) => JSON.parse(resume.value) as Resume
        );

        setResumes(parsedResumes || []);
      } catch (error) {
        console.error("Failed to load resumes:", error);
        setResumes([]);
      } finally {
        setLoadingResumes(false);
      }
    };

    // 只有在用户已认证且Puter准备就绪时才加载简历
    if (auth.isAuthenticated) {
      loadResumes();
    } else {
      setLoadingResumes(false);
    }
  }, [auth.isAuthenticated, kv]);

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>追踪您的工作申请和简历评分</h1>
          {!loadingResumes && resumes?.length === 0 ? (
            <h2>未找到简历。上传您的第一份简历以获取反馈。</h2>
          ) : (
            <h2>查看您的简历并检查AI反馈</h2>
          )}
        </div>
        {loadingResumes && (
          <div className="flex flex-col items-center justify-center">
            <img src="/images/resume-scan-2.gif" className="w-[200px]" />
          </div>
        )}

        {!loadingResumes && resumes.length > 0 && (
          <div className="resumes-section">
            {resumes.map((resume) => (
              <ResumeCard key={resume.id} resume={resume} />
            ))}
          </div>
        )}

        {!loadingResumes && resumes?.length === 0 && (
          <div className="flex flex-col items-center justify-center mt-10 gap-4">
            <Link
              to="/upload"
              className="primary-button w-fit text-xl font-semibold"
            >
              上传简历
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
