import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Button, Field, Input, Textarea, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { createProject } from "../api/client";
import { TagInput } from "../components/TagInput";
import "./NewProject.css";

const TAG_SUGGESTIONS = [
  "monitoring",
  "networking",
  "security",
  "compute",
  "storage",
  "database",
  "devops",
  "iot",
  "ai-ml",
  "containers",
  "serverless",
  "identity",
];

export const NewProject: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="abh-new__auth">
        <h2>Sign in to create a project</h2>
        <Button appearance="primary" onClick={login}>
          Sign in with Microsoft
        </Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        description: description.trim(),
        tags,
        azureServices: [],
        layout: "full-width",
      });
      navigate(`/projects/${project.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setSubmitting(false);
    }
  };

  const isValid = name.trim().length >= 3;

  return (
    <div className="abh-new">
      <div className="abh-new__card">
        <h1 className="abh-new__title">Create New Project</h1>
        <p className="abh-new__subtitle">
          Start building your Azure Portal prototype.
        </p>

        <form className="abh-new__form" onSubmit={handleSubmit}>
          <Field
            label="Project name"
            required
            hint="Minimum 3 characters"
          >
            <Input
              id="project-name"
              value={name}
              onChange={(_, data) => setName(data.value)}
              placeholder="e.g., Cost Management Dashboard"
              minLength={3}
              maxLength={100}
              autoFocus
            />
          </Field>

          <Field label="Description">
            <Textarea
              id="project-desc"
              value={description}
              onChange={(_, data) => setDescription(data.value)}
              placeholder="Briefly describe your project…"
              rows={3}
              maxLength={500}
            />
          </Field>

          <div className="abh-new__field">
            <label>Tags</label>
            <TagInput
              value={tags}
              onChange={setTags}
              suggestions={TAG_SUGGESTIONS}
              placeholder="Add tags…"
              maxTags={5}
            />
          </div>

          {error && (
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
          )}

          <div className="abh-new__actions">
            <Button
              appearance="secondary"
              onClick={() => navigate("/my-projects")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              appearance="primary"
              disabled={!isValid || submitting}
            >
              {submitting ? "Creating…" : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
