import { InstagramCover } from "./instagram-cover";
import { Camera, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  INSTAGRAM_PROFILE,
  type InstagramPost,
} from "@/domain/marketing/instagram";
export function StoreInstagram({ posts }: { posts: InstagramPost[] }) {
  return (
    <section
      id="instagram"
      className="store-instagram"
      aria-labelledby="instagram-heading"
    >
      <div className="store-section-heading">
        <div>
          <h2 id="instagram-heading">No Instagram da B2T</h2>
          <p>
            Ideias, detalhes e bastidores de @somosb2t. As publicações mais
            recentes aparecem primeiro.
          </p>
        </div>
        <Button asChild variant="outline">
          <a href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">
            <Camera aria-hidden="true" data-icon="inline-start" /> Acompanhar
            @somosb2t
          </a>
        </Button>
      </div>
      {posts.length > 0 && (
        <div className="instagram-grid">
          {posts.map((post) => (
            <article className="instagram-post" key={post.id}>
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="instagram-cover"
                aria-label={`${post.kind === "VIDEO" ? "Assistir" : "Ver"} ${post.title} no Instagram`}
              >
                <InstagramCover
                  key={post.sourceImage ?? post.image}
                  src={post.image}
                  alt={post.alt ?? `Capa da publicação: ${post.title}`}
                />
                {post.kind === "VIDEO" && (
                  <Badge variant="secondary" className="instagram-kind">
                    <Play aria-hidden="true" /> Reel
                  </Badge>
                )}
              </a>
              <div className="instagram-copy">
                <time dateTime={post.publishedAt}>
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                    timeZone: "America/Sao_Paulo",
                  }).format(
                    new Date(
                      post.publishedAt.length === 10
                        ? `${post.publishedAt}T12:00:00Z`
                        : post.publishedAt,
                    ),
                  )}
                </time>
                <h3>{post.title}</h3>
                <a
                  href={post.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {post.kind === "VIDEO"
                    ? "Assistir no Instagram"
                    : "Ver publicação no Instagram"}
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
