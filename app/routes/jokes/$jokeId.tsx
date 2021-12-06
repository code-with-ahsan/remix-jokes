import {
  Link,
  LoaderFunction,
  useLoaderData,
  useCatch,
  useParams,
  ActionFunction,
  redirect,
  MetaFunction,
} from "remix";
import type { Joke } from "@prisma/client";
import { db } from "~/utils/db.server";
import { JokeDisplay } from "~/components/joke";

import { getUserId } from "~/utils/session.server";

type LoaderData = { joke: Joke; userId: string | null };

export const meta: MetaFunction = ({
  data,
}: {
  data: LoaderData | undefined;
}) => {
  if (!data) {
    return {
      title: "No joke",
      description: "No joke found",
    };
  }
  return {
    title: `"${data.joke.name}" joke`,
    description: `Enjoy the "${data.joke.name}" joke and much more`,
  };
};

export const loader: LoaderFunction = async ({ params, request }) => {
  const joke = await db.joke.findUnique({
    where: { id: params.jokeId },
  });
  const userId = await getUserId(request);
  if (!joke) {
    throw new Response("What a joke! Not found.", {
      status: 404,
    });
  }
  const data: LoaderData = { joke, userId };
  return data;
};

export const action: ActionFunction = async ({ request, params }) => {
  const form = await request.formData();
  if (form.get("_method") === "delete") {
    const joke = await db.joke.findUnique({
      where: { id: params.jokeId },
    });
    if (!joke) {
      throw new Response("Can't delete what does not exist", { status: 404 });
    }
    await db.joke.delete({ where: { id: params.jokeId } });
    return redirect("/jokes");
  }
};

export default function JokeRoute() {
  const data = useLoaderData<LoaderData>();
  return (
    <JokeDisplay
      joke={data.joke}
      isOwner={data.joke.jokesterId === data.userId}
    />
  );
}

export function CatchBoundary() {
  const caught = useCatch();
  const params = useParams();
  switch (caught.status) {
    case 404: {
      return (
        <div className="error-container">
          Huh? What the heck is {params.jokeId}?
        </div>
      );
    }
    default: {
      throw new Error(`Unhandled error: ${caught.status}`);
    }
  }
}

export function ErrorBoundary() {
  const { jokeId } = useParams();
  return (
    <div className="error-container">{`There was an error loading joke by the id ${jokeId}. Sorry.`}</div>
  );
}
