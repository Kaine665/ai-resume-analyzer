import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { usePuterStore } from "~/lib/puter";
import Navbar from "~/components/Navbar";

const WipeApp = () => {
  const { auth, isLoading, error, clearError, fs, kv } = usePuterStore();
  const navigate = useNavigate();
  const [files, setFiles] = useState<FSItem[]>([]);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const loadData = async () => {
    try {
      // 加载文件列表
      const files = (await fs.readDir("./")) as FSItem[];
      setFiles(files);

      // 加载简历数据
      const resumeData = (await kv.list("resume:*", true)) as KVItem[];
      const parsedResumes =
        resumeData?.map((resume) => JSON.parse(resume.value) as Resume) || [];
      setResumes(parsedResumes);
    } catch (err) {
      console.error("加载数据失败:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate("/auth?next=/wipe");
    }
  }, [isLoading]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteStatus("正在清空所有数据...");

    try {
      // 删除所有文件
      setDeleteStatus("正在删除文件...");
      for (const file of files) {
        try {
          await fs.delete(file.path);
        } catch (err) {
          console.warn(`删除文件失败: ${file.name}`, err);
        }
      }

      // 清空KV存储
      setDeleteStatus("正在清空数据库...");
      await kv.flush();

      setDeleteStatus("清空完成！");

      // 重新加载数据
      await loadData();

      // 2秒后跳转到首页
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (err) {
      setDeleteStatus(
        `清空失败: ${err instanceof Error ? err.message : "未知错误"}`
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar />
        <div className="main-section">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dark-200 mx-auto mb-4"></div>
              <p className="text-dark-200 text-lg">加载中...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar />
        <div className="main-section">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4 text-dark-200">错误</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={clearError} className="primary-button w-fit">
              重试
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>清空所有数据</h1>
          <h2>此操作将永久删除所有简历和分析数据</h2>
        </div>

        <div className="max-w-4xl mx-auto px-4">
          {/* 数据统计 */}
          <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
            <h3 className="text-xl font-bold text-dark-200 mb-4">
              当前数据统计
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-dark-200/80 text-sm">存储文件数量</p>
                <p className="text-2xl font-bold text-dark-200">
                  {files.length}
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-dark-200/80 text-sm">简历记录数量</p>
                <p className="text-2xl font-bold text-dark-200">
                  {resumes.length}
                </p>
              </div>
            </div>
          </div>

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
              <h3 className="text-xl font-bold text-dark-200 mb-4">
                存储的文件
              </h3>
              <div className="max-h-40 overflow-y-auto">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0"
                  >
                    <p className="text-dark-200 truncate font-medium">
                      {file.name}
                    </p>
                    <span className="text-dark-200/60 text-sm bg-gray-100 px-2 py-1 rounded-full">
                      {file.size
                        ? `${Math.round(file.size / 1024)}KB`
                        : "未知大小"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 简历记录列表 */}
          {resumes.length > 0 && (
            <div className="bg-white rounded-2xl p-6 mb-8 shadow-lg">
              <h3 className="text-xl font-bold text-dark-200 mb-4">简历记录</h3>
              <div className="max-h-40 overflow-y-auto">
                {resumes.map((resume) => (
                  <div
                    key={resume.id}
                    className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0"
                  >
                    <div>
                      <p className="text-dark-200 font-medium">
                        {resume.companyName || "未命名公司"} -{" "}
                        {resume.jobTitle || "未命名职位"}
                      </p>
                      <p className="text-dark-200/60 text-sm">
                        ID: {resume.id}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="bg-badge-green text-badge-green-text px-3 py-1 rounded-full text-sm font-medium">
                        评分: {resume.feedback?.overallScore || 0}/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 删除状态 */}
          {isDeleting && (
            <div className="bg-badge-yellow border border-yellow-300 rounded-2xl p-4 mb-6">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-yellow-600 mr-3"></div>
                <p className="text-badge-yellow-text font-medium">
                  {deleteStatus}
                </p>
              </div>
            </div>
          )}

          {/* 确认对话框 */}
          {showConfirm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                <h3 className="text-xl font-bold text-dark-200 mb-4">
                  确认删除
                </h3>
                <p className="text-dark-200/80 mb-4">
                  此操作将永久删除所有数据，包括：
                </p>
                <ul className="list-disc list-inside text-dark-200/80 mb-6 space-y-1">
                  <li>{files.length} 个存储文件</li>
                  <li>{resumes.length} 条简历记录</li>
                  <li>所有分析结果和反馈</li>
                </ul>
                <p className="text-red-600 font-medium mb-6">
                  此操作无法撤销！
                </p>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-3 bg-gray-200 text-dark-200 rounded-full hover:bg-gray-300 font-medium"
                    disabled={isDeleting}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleDelete}
                    className="flex-1 px-4 py-3 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50 font-medium"
                    disabled={isDeleting}
                  >
                    {isDeleting ? "删除中..." : "确认删除"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 操作按钮 */}
          <div className="text-center">
            {files.length === 0 && resumes.length === 0 ? (
              <div className="bg-badge-green border border-green-300 rounded-2xl p-6">
                <p className="text-badge-green-text text-lg font-medium">
                  ✅ 没有数据需要清空
                </p>
                <button
                  onClick={() => navigate("/")}
                  className="primary-button w-fit text-xl font-semibold mt-4"
                >
                  返回首页
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirm(true)}
                className="px-8 py-4 bg-red-500 text-white text-lg font-semibold rounded-full hover:bg-red-600 disabled:opacity-50 shadow-lg"
                disabled={isDeleting}
              >
                {isDeleting ? "清空中..." : "清空所有数据"}
              </button>
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

export default WipeApp;
