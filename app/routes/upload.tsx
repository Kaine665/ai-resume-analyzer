import { type FormEvent, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage, extractPdfText } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";

const Upload = () => {
  const { auth, isLoading, fs, ai, kv } = usePuterStore();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => {
    setFile(file);
  };

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);

    try {
      setStatusText("正在上传文件...");
      const uploadedFile = await fs.upload([file]);
      if (!uploadedFile) {
        setStatusText("错误：文件上传失败");
        return;
      }

      setStatusText("正在转换为图片...");
      const imageFile = await convertPdfToImage(file);
      if (!imageFile.file) {
        setStatusText("错误：PDF 转图片失败");
        return;
      }

      setStatusText("正在上传图片...");
      const uploadedImage = await fs.upload([imageFile.file]);
      if (!uploadedImage) {
        setStatusText("错误：图片上传失败");
        return;
      }

      setStatusText("准备数据中...");
      const uuid = generateUUID();
      const data = {
        id: uuid,
        resumePath: uploadedFile.path,
        imagePath: uploadedImage.path,
        companyName,
        jobTitle,
        jobDescription,
        feedback: "",
      };

      // 添加错误处理
      const kvResult = await kv.set(`resume:${uuid}`, JSON.stringify(data));
      if (!kvResult) {
        setStatusText("错误：数据保存失败");
        return;
      }

      setStatusText("正在提取文本内容...");
      let fileText: string;

      if (file.type === "application/pdf") {
        // 对于PDF文件，使用PDF文本提取
        try {
          fileText = await extractPdfText(file);
        } catch (error) {
          setStatusText("错误：PDF文本提取失败");
          return;
        }
      } else {
        // 对于其他文件类型，使用原来的方法
        const fileBlob = await fs.read(uploadedFile.path);
        if (!fileBlob) {
          setStatusText("错误：读取上传文件失败");
          return;
        }
        fileText = await fileBlob.text();
      }

      // 添加文本截断功能
      const truncateText = (text: string, maxLength: number = 50000) => {
        if (text.length <= maxLength) return text;

        // 尝试在句号、换行符或空格处截断
        const truncated = text.substring(0, maxLength);
        const lastSentenceEnd = Math.max(
          truncated.lastIndexOf("."),
          truncated.lastIndexOf("\n"),
          truncated.lastIndexOf(" ")
        );

        return lastSentenceEnd > maxLength * 0.8
          ? truncated.substring(0, lastSentenceEnd + 1)
          : truncated + "...";
      };

      const truncatedFileText = truncateText(fileText);
      const fullPrompt = `${prepareInstructions({
        jobTitle,
        jobDescription,
      })}\n\n简历内容：\n${truncatedFileText}`;

      setStatusText("正在分析简历...");
      const feedback = await ai.feedback(uploadedFile.path, fullPrompt);
      if (!feedback) {
        setStatusText("错误：简历分析失败");
        return;
      }

      const feedbackText =
        typeof feedback.message.content === "string"
          ? feedback.message.content
          : feedback.message.content[0].text;

      data.feedback = JSON.parse(feedbackText);

      // 更新数据到KV存储
      const updateResult = await kv.set(`resume:${uuid}`, JSON.stringify(data));
      if (!updateResult) {
        setStatusText("错误：更新数据失败");
        return;
      }

      setStatusText("分析完成，正在跳转...");
      console.log(data);
      navigate(`/resume/${uuid}`);
    } catch (error) {
      console.error("Analysis error:", error);
      setStatusText(
        `错误：${error instanceof Error ? error.message : "未知错误"}`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;
    const formData = new FormData(form);

    const companyName = formData.get("company-name") as string;
    const jobTitle = formData.get("job-title") as string;
    const jobDescription = formData.get("job-description") as string;

    if (!file) return;

    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  return (
    <main className="bg-[url('/images/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>为你的理想工作智能打分</h1>
          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/images/resume-scan.gif" className="w-full" />
            </>
          ) : (
            <h2>上传你的简历，获取ATS评分和优化建议</h2>
          )}
          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">公司名称</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="请输入公司名称"
                  id="company-name"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-title">职位名称</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="请输入职位名称"
                  id="job-title"
                />
              </div>
              <div className="form-div">
                <label htmlFor="job-description">职位描述</label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="请输入职位描述"
                  id="job-description"
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">上传简历</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>

              <button className="primary-button" type="submit">
                分析简历
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};
export default Upload;
